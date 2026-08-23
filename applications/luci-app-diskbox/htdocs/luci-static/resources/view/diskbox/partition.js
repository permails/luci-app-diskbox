'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callGetDiskInfo = rpc.declare({
	object: 'luci.diskbox',
	method: 'get_disk_info',
	params: ['device']
});

var callGetSmartAttr = rpc.declare({
	object: 'luci.diskbox',
	method: 'get_smart_attr',
	params: ['device']
});

var callGetFormatCmd = rpc.declare({
	object: 'luci.diskbox',
	method: 'get_format_cmd',
	expect: { formats: {} }
});

var callFormatPartition = rpc.declare({
	object: 'luci.diskbox',
	method: 'format_partition',
	params: ['partition', 'filesystem']
});

var callMkPartitionTable = rpc.declare({
	object: 'luci.diskbox',
	method: 'mk_partition_table',
	params: ['device', 'table']
});

var callCreatePartition = rpc.declare({
	object: 'luci.diskbox',
	method: 'create_partition',
	params: ['device', 'start_sec', 'end_sec', 'type']
});

var callRemovePartition = rpc.declare({
	object: 'luci.diskbox',
	method: 'remove_partition',
	params: ['device', 'number']
});

var callEjectDevice = rpc.declare({
	object: 'luci.diskbox',
	method: 'eject_device',
	params: ['device']
});

return view.extend({
	load: function() {
		var dev = (L.env && L.env.requestpath && L.env.requestpath[4]) || 'sda';
		return Promise.all([
			callGetDiskInfo(dev),
			callGetFormatCmd(),
			Promise.resolve(dev)
		]);
	},

	showSmartModal: function(dev) {
		ui.showModal(_('S.M.A.R.T Attributes') + ' - /dev/' + dev, [
			E('p', { 'class': 'spinning' }, _('Collecting data...') + ' / ' + _('正在收集数据...'))
		]);

		callGetSmartAttr(dev).then(function(res) {
			var attrs = (res && res.attributes) ? res.attributes : (Array.isArray(res) ? res : []);
			if (attrs.length === 0) {
				ui.showModal(_('S.M.A.R.T Attributes') + ' - /dev/' + dev, [
					E('p', { 'style': 'font-style:italic; padding:1rem;' }, _('No SMART attributes to display.'))
				]);
				return;
			}

			var modalContent;
			if (attrs[0].key !== undefined) {
				var table = E('table', { 'class': 'table cbi-section-table' }, [
					E('tr', { 'class': 'tr table-titles' }, [
						E('th', { 'class': 'th' }, 'KEY'),
						E('th', { 'class': 'th' }, 'Value')
					])
				]);
				attrs.forEach(function(item) {
					table.appendChild(E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, item.key),
						E('td', { 'class': 'td' }, item.value)
					]));
				});
				modalContent = table;
			} else {
				var table = E('table', { 'class': 'table cbi-section-table' }, [
					E('tr', { 'class': 'tr table-titles' }, [
						E('th', { 'class': 'th' }, 'ID'),
						E('th', { 'class': 'th' }, _('Attrbute') + ' / ' + _('属性')),
						E('th', { 'class': 'th' }, _('Flag')),
						E('th', { 'class': 'th' }, _('Value')),
						E('th', { 'class': 'th' }, _('Worst')),
						E('th', { 'class': 'th' }, _('Thresh')),
						E('th', { 'class': 'th' }, _('Type')),
						E('th', { 'class': 'th' }, _('Updated')),
						E('th', { 'class': 'th' }, _('Raw'))
					])
				]);

				attrs.forEach(function(item) {
					var isCritical = ((item.id === '05' || item.id === 'C5') && item.raw !== '0');
					var rowStyle = isCritical ? 'background-color:rgba(245, 54, 92, 0.25) !important;' : '';

					table.appendChild(E('tr', { 'class': 'tr', 'style': rowStyle }, [
						E('td', { 'class': 'td' }, E('code', {}, item.id)),
						E('td', { 'class': 'td' }, item.attrbute || item.attribute),
						E('td', { 'class': 'td' }, item.flag || '-'),
						E('td', { 'class': 'td' }, item.value || '-'),
						E('td', { 'class': 'td' }, item.worst || '-'),
						E('td', { 'class': 'td' }, item.thresh || '-'),
						E('td', { 'class': 'td' }, item.type || '-'),
						E('td', { 'class': 'td' }, item.updated || '-'),
						E('td', { 'class': 'td' }, E('strong', {}, item.raw || '-'))
					]));
				});
				modalContent = table;
			}

			ui.showModal(_('S.M.A.R.T Attributes') + ' - /dev/' + dev, [
				E('div', { 'style': 'max-height:70vh; overflow-y:auto;' }, [ modalContent ]),
				E('div', { 'class': 'right', 'style': 'margin-top:1rem;' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-neutral',
						'click': ui.hideModal
					}, _('Cancel') + ' / ' + _('关闭'))
				])
			]);
		});
	},

	showFormatModal: function(partName, formatCmds, currentFs) {
		var selFs = E('select', { 'class': 'cbi-input-select', 'style': 'width:100%;' });
		Object.keys(formatCmds).forEach(function(fs) {
			var opt = E('option', { 'value': fs }, fs.toUpperCase());
			if (fs === currentFs) opt.selected = true;
			selFs.appendChild(opt);
		});

		var statusP = E('p', { 'style': 'color:#f5365c; font-weight:bold; margin-top:8px;' });

		ui.showModal(_('Format partation:') + ' /dev/' + partName, [
			E('p', {}, _('Formatting partition will ERASE all data stored on it.')),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('File System') + ' / ' + _('文件系统')),
				E('div', { 'class': 'cbi-value-field' }, selFs)
			]),
			statusP,
			E('div', { 'class': 'right', 'style': 'margin-top:1.5rem; display:flex; justify-content:flex-end; gap:8px;' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-reset',
					'click': ui.hideModal
				}, _('Cancel') + ' / ' + _('取消')),
				E('button', {
					'class': 'btn cbi-button cbi-button-apply',
					'click': function(ev) {
						ev.preventDefault();
						var targetFs = selFs.value;
						dom.content(statusP, [ E('span', { 'class': 'spinning' }, _('Formatting..') + ' / ' + _('正在格式化...')) ]);
						this.disabled = true;

						callFormatPartition(partName, targetFs).then(function(res) {
							if (res && res.code === 0) {
								ui.addNotification(null, E('p', {}, _('Partition formatted successfully!')));
								location.reload();
							} else {
								dom.content(statusP, res ? res.error : _('Format failed.'));
							}
						});
					}
				}, _('Format') + ' / ' + _('格式化'))
			])
		]);
	},

	render: function(data) {
		var self = this;
		var diskInfo = data[0] || {};
		var formatCmds = data[1] || {};
		var devName = data[2];

		var viewRoot = E('div', { 'class': 'cbi-map' });

		// Header & Back Button
		var headerDiv = E('div', { 'style': 'display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;' }, [
			E('div', {}, [
				E('h2', { 'style': 'margin-bottom:0.25rem;' }, _('Partition Management') + ' ' + _('分区管理') + ' - /dev/' + devName),
				E('div', { 'class': 'cbi-map-descr' }, _('Partition Disk over LuCI.') + ' ' + _('通过 LuCI 管理磁盘分区'))
			]),
			E('a', {
				'class': 'btn cbi-button cbi-button-link',
				'href': L.url('admin/system/diskbox')
			}, '« ' + _('Back to Overview') + ' / ' + _('返回概览'))
		]);
		viewRoot.appendChild(headerDiv);

		if (diskInfo.error || !diskInfo.size) {
			viewRoot.appendChild(E('div', { 'class': 'cbi-section' }, [
				E('div', { 'style': 'padding:2rem; text-align:center;' }, [
					E('p', { 'style': 'font-size:1.1rem; color:#f5365c;' }, _('Device /dev/%s not found or has no media.').format(devName)),
					E('a', {
						'class': 'btn cbi-button cbi-button-link',
						'href': L.url('admin/system/diskbox'),
						'style': 'margin-top:1rem;'
					}, _('Back to Overview') + ' / ' + _('返回概览'))
				])
			]));
			return viewRoot;
		}

		// Section: Device Info
		var devSection = E('div', { 'class': 'cbi-section' }, [
			E('legend', {}, _('Device Info') + ' / ' + _('设备信息'))
		]);

		var isRaid = diskInfo.type && diskInfo.type.startsWith('md');

		var devTable = E('table', { 'class': 'table cbi-section-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, _('Path') + ' / ' + _('路径')),
				E('th', { 'class': 'th' }, _('Model') + ' / ' + _('型号')),
				E('th', { 'class': 'th' }, _('Serial Number') + ' / ' + _('序列号')),
				E('th', { 'class': 'th' }, _('Size') + ' / ' + _('大小')),
				E('th', { 'class': 'th' }, _('Sector Size') + ' / ' + _('扇区大小')),
				E('th', { 'class': 'th' }, _('Partition Table') + ' / ' + _('分区表')),
				isRaid ? E('th', { 'class': 'th' }, _('Level')) : E('th', { 'class': 'th' }, _('Temp') + ' / ' + _('温度')),
				isRaid ? E('th', { 'class': 'th' }, _('Members')) : E('th', { 'class': 'th' }, _('SATA Version') + ' / ' + _('SATA 版本')),
				isRaid ? E('th', { 'class': 'th' }, _('Status') + ' / ' + _('状态')) : E('th', { 'class': 'th' }, _('Rotation Rate') + ' / ' + _('转速')),
				E('th', { 'class': 'th' }, _('Status') + ' / ' + _('状态')),
				E('th', { 'class': 'th' }, _('Health') + ' / ' + _('健康')),
				E('th', { 'class': 'th center' }, '')
			])
		]);

		// Partition table selector or text
		var ptCell;
		var hasPartitions = diskInfo.partitions && diskInfo.partitions.some(function(p){ return p.number > 0; });
		if (!hasPartitions && diskInfo.p_table && !diskInfo.p_table.includes('Raid')) {
			var ptSelect = E('select', { 'class': 'cbi-input-select' }, [
				E('option', { 'value': 'GPT', 'selected': diskInfo.p_table === 'GPT' }, 'GPT'),
				E('option', { 'value': 'MBR', 'selected': diskInfo.p_table === 'MBR' }, 'MBR')
			]);
			ptSelect.addEventListener('change', function() {
				var targetTbl = this.value;
				if (confirm(_('Warning !!\nTHIS WILL OVERWRITE EXISTING PARTITIONS!!\nModify the partition table to %s?').format(targetTbl))) {
					ui.showModal(_('Modifying Partition Table'), [ E('p', { 'class': 'spinning' }, _('Applying partition table...')) ]);
					callMkPartitionTable(devName, targetTbl).then(function(res) {
						if (res && res.code !== 0) {
							ui.addNotification(null, E('p', {}, res.error || _('Failed to modify partition table.')));
						}
						location.reload();
					});
				} else {
					location.reload();
				}
			});
			ptCell = ptSelect;
		} else {
			ptCell = diskInfo.p_table || '-';
		}

		// Health button
		var healthBtn = E('button', {
			'class': 'btn cbi-button ' + ((diskInfo.health === 'PASSED' || diskInfo.health === 'Normal') ? 'cbi-button-add' : 'cbi-button-remove'),
			'click': function(ev) {
				ev.preventDefault();
				self.showSmartModal(devName);
			}
		}, diskInfo.health || _('Health') + ' / ' + _('健康'));

		// Eject button
		var anyMounted = diskInfo.partitions && diskInfo.partitions.some(function(p){ return p.mount_point !== '-'; });
		var ejectBtn = E('button', {
			'class': 'btn cbi-button cbi-button-remove',
			'disabled': anyMounted,
			'click': function(ev) {
				ev.preventDefault();
				if (anyMounted) {
					ui.addNotification(null, E('p', {}, _('Partition is in use! Please unmount it first!')));
					return;
				}
				if (!confirm(_('Are you sure you want to eject/remove this device?'))) return;
				ui.showModal(_('Ejecting'), [ E('p', { 'class': 'spinning' }, _('Ejecting device...')) ]);
				callEjectDevice(devName).then(function(res) {
					if (res && res.code !== 0) {
						ui.addNotification(null, E('p', {}, res.error || _('Failed to eject device.')));
					}
					window.location.href = L.url('admin/system/diskbox');
				});
			}
		}, isRaid ? (_('Remove') + ' / ' + _('删除')) : (_('Eject') + ' / ' + _('弹出')));

		devTable.appendChild(E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td' }, E('strong', {}, diskInfo.path)),
			E('td', { 'class': 'td' }, diskInfo.model || '-'),
			E('td', { 'class': 'td' }, diskInfo.sn || '-'),
			E('td', { 'class': 'td' }, diskInfo.size_formated || '-'),
			E('td', { 'class': 'td' }, diskInfo.sec_size || '-'),
			E('td', { 'class': 'td' }, ptCell),
			isRaid ? E('td', { 'class': 'td' }, diskInfo.level || '-') : E('td', { 'class': 'td' }, diskInfo.temp || '-'),
			isRaid ? E('td', { 'class': 'td' }, diskInfo.members_str || '-') : E('td', { 'class': 'td' }, diskInfo.sata_ver || '-'),
			isRaid ? E('td', { 'class': 'td' }, diskInfo.status || '-') : E('td', { 'class': 'td' }, diskInfo.rota_rate || '-'),
			E('td', { 'class': 'td' }, diskInfo.status || '-'),
			E('td', { 'class': 'td' }, healthBtn),
			E('td', { 'class': 'td center' }, ejectBtn)
		]));

		devSection.appendChild(devTable);
		viewRoot.appendChild(devSection);

		// Section: Partitions Info
		if (!diskInfo.p_table || !diskInfo.p_table.includes('Raid')) {
			var partSection = E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Partitions Info') + ' / ' + _('分区信息')),
				E('div', { 'class': 'cbi-section-descr' }, _('Default 2048 sector alignment, support +size{b,k,m,g,t} in End Sector') + ' / ' + _('默认 2048 扇区对齐，支持在【终止扇区】输入 +容量{b,k,m,g,t}'))
			]);

			var partTable = E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('Name') + ' / ' + _('名称')),
					E('th', { 'class': 'th' }, _('Start Sector') + ' / ' + _('起始扇区')),
					E('th', { 'class': 'th' }, _('End Sector') + ' / ' + _('终止扇区')),
					E('th', { 'class': 'th' }, _('Size') + ' / ' + _('大小')),
					E('th', { 'class': 'th' }, _('Used') + ' / ' + _('已用')),
					E('th', { 'class': 'th' }, _('Free Space') + ' / ' + _('可用空间')),
					E('th', { 'class': 'th' }, _('Usage') + ' / ' + _('使用率')),
					E('th', { 'class': 'th' }, _('Mount Point') + ' / ' + _('挂载点')),
					E('th', { 'class': 'th' }, _('File System') + ' / ' + _('文件系统')),
					E('th', { 'class': 'th center' }, '')
				])
			]);

			var partitions = diskInfo.partitions || [];
			partitions.forEach(function(part) {
				var isFree = (part.number === -1);
				var isMounted = (part.mount_point !== '-');

				if (isFree) {
					var startIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': part.sec_start });
					var endIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': part.sec_end });

					var createBtn = E('button', {
						'class': 'btn cbi-button cbi-button-add',
						'click': function(ev) {
							ev.preventDefault();
							var sSec = startIn.value;
							var eSec = endIn.value;
							if (!sSec || !eSec) {
								ui.addNotification(null, E('p', {}, _('Invalid Start or End sector!')));
								return;
							}
							ui.showModal(_('Creating Partition'), [ E('p', { 'class': 'spinning' }, _('Creating new partition...')) ]);
							callCreatePartition(devName, sSec, eSec, 'primary').then(function(res) {
								if (res && res.code !== 0) {
									ui.addNotification(null, E('p', {}, res.error || _('Failed to create partition.')));
								}
								location.reload();
							});
						}
					}, _('New') + ' / ' + _('新建'));

					partTable.appendChild(E('tr', { 'class': 'tr', 'style': 'background-color:rgba(255,255,255,0.03);' }, [
						E('td', { 'class': 'td', 'style': 'font-style:italic; color:#888;' }, _('Free Space') + ' / ' + _('空闲空间')),
						E('td', { 'class': 'td' }, startIn),
						E('td', { 'class': 'td' }, endIn),
						E('td', { 'class': 'td' }, part.size_formated),
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td' }, '-'),
						E('td', { 'class': 'td center' }, createBtn)
					]));
				} else {
					var formatBtn;
					if (!isMounted && part.fs !== 'extended') {
						formatBtn = E('button', {
							'class': 'btn cbi-button cbi-button-reset',
							'click': function(ev) {
								ev.preventDefault();
								self.showFormatModal(part.name, formatCmds, part.fs);
							}
						}, (part.fs === 'raw' ? (_('Format') + ' / ' + _('格式化')) : part.fs.toUpperCase()));
					} else {
						formatBtn = E('span', {}, part.fs);
					}

					var removeBtn = E('button', {
						'class': 'btn cbi-button cbi-button-remove',
						'disabled': isMounted,
						'click': function(ev) {
							ev.preventDefault();
							if (!confirm(_('Are you sure you want to delete partition %s?').format(part.name))) return;
							ui.showModal(_('Deleting Partition'), [ E('p', { 'class': 'spinning' }, _('Removing partition...')) ]);
							callRemovePartition(devName, part.number).then(function(res) {
								if (res && res.code !== 0) {
									ui.addNotification(null, E('p', {}, res.error || _('Failed to remove partition.')));
								}
								location.reload();
							});
						}
					}, _('Remove') + ' / ' + _('删除'));

					partTable.appendChild(E('tr', { 'class': 'tr' }, [
						E('td', { 'class': 'td' }, E('strong', {}, part.name)),
						E('td', { 'class': 'td' }, part.sec_start),
						E('td', { 'class': 'td' }, part.sec_end),
						E('td', { 'class': 'td' }, part.size_formated),
						E('td', { 'class': 'td' }, part.used_formated || '-'),
						E('td', { 'class': 'td' }, part.free_formated || '-'),
						E('td', { 'class': 'td' }, part.usage || '-'),
						E('td', { 'class': 'td' }, part.mount_point !== '-' ? E('code', {}, part.mount_point) : '-'),
						E('td', { 'class': 'td' }, formatBtn),
						E('td', { 'class': 'td center' }, removeBtn)
					]));
				}
			});

			partSection.appendChild(partTable);
			viewRoot.appendChild(partSection);
		}

		return viewRoot;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});

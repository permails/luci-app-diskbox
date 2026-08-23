'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callListDevices = rpc.declare({
	object: 'luci.diskbox',
	method: 'list_devices',
	expect: { devices: {} }
});

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

var callRescanDisks = rpc.declare({
	object: 'luci.diskbox',
	method: 'rescan_disks'
});

var callGetMountPoints = rpc.declare({
	object: 'luci.diskbox',
	method: 'get_mount_points',
	expect: { mount_points: [] }
});

var callMount = rpc.declare({
	object: 'luci.diskbox',
	method: 'mount',
	params: ['device', 'point', 'fs', 'options']
});

var callUmount = rpc.declare({
	object: 'luci.diskbox',
	method: 'umount',
	params: ['point']
});

var callListRaidDevices = rpc.declare({
	object: 'luci.diskbox',
	method: 'list_raid_devices',
	expect: { raid_devices: {} }
});

var callCreateRaid = rpc.declare({
	object: 'luci.diskbox',
	method: 'create_raid',
	params: ['name', 'level', 'members']
});

var callListBtrfsDevices = rpc.declare({
	object: 'luci.diskbox',
	method: 'list_btrfs_devices',
	expect: { btrfs_devices: {} }
});

var callGetBtrfsInfo = rpc.declare({
	object: 'luci.diskbox',
	method: 'get_btrfs_info',
	params: ['uuid']
});

var callGetBtrfsSubvolumes = rpc.declare({
	object: 'luci.diskbox',
	method: 'get_btrfs_subvolumes',
	params: ['uuid'],
	expect: { subvolumes: [] }
});

var callCreateBtrfs = rpc.declare({
	object: 'luci.diskbox',
	method: 'create_btrfs',
	params: ['label', 'level', 'members']
});

var callBtrfsSetLabel = rpc.declare({
	object: 'luci.diskbox',
	method: 'btrfs_set_label',
	params: ['uuid', 'label']
});

var callBtrfsSubvolCreate = rpc.declare({
	object: 'luci.diskbox',
	method: 'btrfs_subvol_create',
	params: ['uuid', 'path']
});

var callBtrfsSubvolDelete = rpc.declare({
	object: 'luci.diskbox',
	method: 'btrfs_subvol_delete',
	params: ['uuid', 'path']
});

var callBtrfsSubvolSetDefault = rpc.declare({
	object: 'luci.diskbox',
	method: 'btrfs_subvol_set_default',
	params: ['uuid', 'path']
});

var callBtrfsSnapshotCreate = rpc.declare({
	object: 'luci.diskbox',
	method: 'btrfs_snapshot_create',
	params: ['uuid', 'source', 'dest', 'readonly']
});

return view.extend({
	load: function() {
		return Promise.all([
			callListDevices(),
			callGetMountPoints(),
			callListRaidDevices(),
			callListBtrfsDevices(),
			callGetFormatCmd()
		]);
	},

	showSmartModal: function(dev) {
		ui.showModal(_('S.M.A.R.T 属性') + ' - /dev/' + dev, [
			E('p', { 'class': 'spinning' }, _('正在收集数据...'))
		]);

		callGetSmartAttr(dev).then(function(res) {
			var attrs = (res && res.attributes) ? res.attributes : (Array.isArray(res) ? res : []);
			if (attrs.length === 0) {
				ui.showModal(_('S.M.A.R.T 属性') + ' - /dev/' + dev, [
					E('p', { 'style': 'font-style:italic; padding:1rem;' }, _('暂无 SMART 属性显示。'))
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
						E('th', { 'class': 'th' }, _('属性')),
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

			ui.showModal(_('S.M.A.R.T 属性') + ' - /dev/' + dev, [
				E('div', { 'style': 'max-height:70vh; overflow-y:auto;' }, [ modalContent ]),
				E('div', { 'class': 'right', 'style': 'margin-top:1rem;' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-neutral',
						'click': ui.hideModal
					}, _('关闭'))
				])
			]);
		});
	},

	showFormatModal: function(partName, formatCmds, currentFs, onSuccess) {
		var selFs = E('select', { 'class': 'cbi-input-select', 'style': 'width:100%;' });
		Object.keys(formatCmds).forEach(function(fs) {
			var opt = E('option', { 'value': fs }, fs.toUpperCase());
			if (fs === currentFs) opt.selected = true;
			selFs.appendChild(opt);
		});

		var statusP = E('p', { 'style': 'color:#f5365c; font-weight:bold; margin-top:8px;' });

		ui.showModal(_('格式化分区：') + ' /dev/' + partName, [
			E('p', {}, _('格式化分区将清除其上的所有数据！')),
			E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('文件系统')),
				E('div', { 'class': 'cbi-value-field' }, selFs)
			]),
			statusP,
			E('div', { 'class': 'right', 'style': 'margin-top:1.5rem; display:flex; justify-content:flex-end; gap:8px;' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-reset',
					'click': ui.hideModal
				}, _('取消')),
				E('button', {
					'class': 'btn cbi-button cbi-button-apply',
					'click': function(ev) {
						ev.preventDefault();
						var targetFs = selFs.value;
						dom.content(statusP, [ E('span', { 'class': 'spinning' }, _('正在格式化...')) ]);
						this.disabled = true;

						callFormatPartition(partName, targetFs).then(function(res) {
							if (res && res.code === 0) {
								ui.addNotification(null, E('p', {}, _('分区格式化成功！')));
								ui.hideModal();
								if (typeof onSuccess === 'function') {
									onSuccess();
								} else {
									location.reload();
								}
							} else {
								dom.content(statusP, res ? res.error : _('格式化失败。'));
							}
						});
					}
				}, _('格式化'))
			])
		]);
	},

	renderPartitionRow: function(devName, colSpan) {
		var p_colors = ["#c0c0ff", "#fbbd00", "#e97c30", "#a0e0a0", "#e0c0ff"];
		var barTr = E('tr', { 'class': 'tr', 'style': 'width:100%; white-space:nowrap;' });
		var barTd = E('td', {
			'class': 'td',
			'colspan': colSpan,
			'style': 'margin:0; padding:0; border:0; white-space:nowrap; overflow:hidden;'
		});
		barTr.appendChild(barTd);

		callGetDiskInfo(devName).then(function(info) {
			if (!info || !info.partitions || info.partitions.length === 0 || !info.size || info.size <= 0) {
				barTr.style.display = 'none';
				return;
			}

			var expand = 0;
			var need_expand = 0;
			info.partitions.forEach(function(part) {
				var p = (part.size / info.size) * 100;
				if (p <= 8) {
					expand += 8;
					need_expand += p;
					part.part_percent = 8;
				}
			});

			var n = 0;
			var container = E('div', { 'style': 'width:100%; display:flex; height:24px; line-height:24px;' });

			info.partitions.forEach(function(part) {
				var p = (part.size / info.size) * 100;
				if (p > 8) {
					part.part_percent = p * (100 - expand) / (100 - need_expand);
				}
				var part_percent = (part.part_percent || 8) + '%';
				var p_color = (part.fs === 'Free Space' || part.number === -1) ? '#b0b8c4' : p_colors[n++ % p_colors.length];
				var inline_txt = (part.name !== '-' && part.name ? part.name : '') + ' ' +
					(part.fs !== 'Free Space' && part.fs ? part.fs : '') + ' ' +
					(part.size_formated || '') + ' ' +
					(part.usage !== '-' && part.usage ? part.usage : '');

				var seg = E('div', {
					'title': inline_txt.trim(),
					'style': 'color:#333; font-weight:bold; font-size:11px; display:inline-block; text-align:center; background-color:' + p_color + '; width:' + part_percent + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border-right:1px solid rgba(255,255,255,0.4);'
				}, inline_txt.trim());

				container.appendChild(seg);
			});

			dom.content(barTd, container);
		});

		return barTr;
	},

	renderPartitionDetailView: function(container, devName, data) {
		var self = this;
		var formatCmds = data[4] || {};

		ui.showModal(_('加载中...'), [ E('p', { 'class': 'spinning' }, _('正在加载设备信息...')) ]);

		callGetDiskInfo(devName).then(function(diskInfo) {
			ui.hideModal();
			dom.content(container, []);

			var viewRoot = E('div', { 'class': 'cbi-map' });

			// Header & Back Button
			var headerDiv = E('div', { 'style': 'display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;' }, [
				E('div', {}, [
					E('h2', { 'style': 'margin-bottom:0.25rem;' }, _('分区管理') + ' - /dev/' + devName),
					E('div', { 'class': 'cbi-map-descr' }, _('通过 LuCI 管理磁盘分区'))
				]),
				E('button', {
					'class': 'btn cbi-button cbi-button-link',
					'click': function() { self.renderOverview(container, data); }
				}, '« ' + _('返回概览'))
			]);
			viewRoot.appendChild(headerDiv);

			if (diskInfo.error || !diskInfo.size) {
				viewRoot.appendChild(E('div', { 'class': 'cbi-section' }, [
					E('div', { 'style': 'padding:2rem; text-align:center;' }, [
						E('p', { 'style': 'font-size:1.1rem; color:#f5365c;' }, _('未找到设备 /dev/%s 或无介质。').format(devName)),
						E('button', {
							'class': 'btn cbi-button cbi-button-link',
							'style': 'margin-top:1rem;',
							'click': function() { self.renderOverview(container, data); }
						}, _('返回概览'))
					])
				]));
				container.appendChild(viewRoot);
				return;
			}

			// Section: Device Info
			var devSection = E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('设备信息'))
			]);

			var isRaid = diskInfo.type && diskInfo.type.startsWith('md');

			var devTable = E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('路径')),
					E('th', { 'class': 'th' }, _('型号')),
					E('th', { 'class': 'th' }, _('序列号')),
					E('th', { 'class': 'th' }, _('大小')),
					E('th', { 'class': 'th' }, _('扇区大小')),
					E('th', { 'class': 'th' }, _('分区表')),
					isRaid ? E('th', { 'class': 'th' }, _('级别')) : E('th', { 'class': 'th' }, _('温度')),
					isRaid ? E('th', { 'class': 'th' }, _('成员')) : E('th', { 'class': 'th' }, _('SATA 版本')),
					isRaid ? E('th', { 'class': 'th' }, _('状态')) : E('th', { 'class': 'th' }, _('转速')),
					E('th', { 'class': 'th' }, _('状态')),
					E('th', { 'class': 'th' }, _('健康')),
					E('th', { 'class': 'th center' }, '')
				])
			]);

			var ptCell;
			var hasPartitions = diskInfo.partitions && diskInfo.partitions.some(function(p){ return p.number > 0; });
			if (!hasPartitions && diskInfo.p_table && !diskInfo.p_table.includes('Raid')) {
				var ptSelect = E('select', { 'class': 'cbi-input-select' }, [
					E('option', { 'value': 'GPT', 'selected': diskInfo.p_table === 'GPT' }, 'GPT'),
					E('option', { 'value': 'MBR', 'selected': diskInfo.p_table === 'MBR' }, 'MBR')
				]);
				ptSelect.addEventListener('change', function() {
					var targetTbl = this.value;
					if (confirm(_('警告！！\n这将覆盖现有分区！\n确定修改分区表为 %s 吗？').format(targetTbl))) {
						ui.showModal(_('修改分区表'), [ E('p', { 'class': 'spinning' }, _('正在应用分区表...')) ]);
						callMkPartitionTable(devName, targetTbl).then(function(res) {
							if (res && res.code !== 0) {
								ui.addNotification(null, E('p', {}, res.error || _('修改分区表失败。')));
							}
							self.renderPartitionDetailView(container, devName, data);
						});
					} else {
						self.renderPartitionDetailView(container, devName, data);
					}
				});
				ptCell = ptSelect;
			} else {
				ptCell = diskInfo.p_table || '-';
			}

			var healthBtn = E('button', {
				'class': 'btn cbi-button ' + ((diskInfo.health === 'PASSED' || diskInfo.health === 'Normal') ? 'cbi-button-add' : 'cbi-button-remove'),
				'click': function(ev) {
					ev.preventDefault();
					self.showSmartModal(devName);
				}
			}, diskInfo.health || _('健康'));

			var anyMounted = diskInfo.partitions && diskInfo.partitions.some(function(p){ return p.mount_point !== '-'; });
			var ejectBtn = E('button', {
				'class': 'btn cbi-button cbi-button-remove',
				'disabled': anyMounted,
				'click': function(ev) {
					ev.preventDefault();
					if (anyMounted) {
						ui.addNotification(null, E('p', {}, _('分区使用中！请先卸载！')));
						return;
					}
					if (!confirm(_('确定要弹出/移除此设备吗？'))) return;
					ui.showModal(_('正在弹出'), [ E('p', { 'class': 'spinning' }, _('正在弹出设备...')) ]);
					callEjectDevice(devName).then(function(res) {
						if (res && res.code !== 0) {
							ui.addNotification(null, E('p', {}, res.error || _('弹出设备失败。')));
						}
						self.renderOverview(container, data);
					});
				}
			}, isRaid ? _('删除') : _('弹出'));

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
					E('legend', {}, _('分区信息')),
					E('div', { 'class': 'cbi-section-descr' }, _('默认 2048 扇区对齐，【终止扇区】支持 +容量{b,k,m,g,t} 格式，例：+500m +10g +1t'))
				]);

				var partTable = E('table', { 'class': 'table cbi-section-table' }, [
					E('tr', { 'class': 'tr table-titles' }, [
						E('th', { 'class': 'th' }, _('名称')),
						E('th', { 'class': 'th' }, _('起始扇区')),
						E('th', { 'class': 'th' }, _('终止扇区')),
						E('th', { 'class': 'th' }, _('大小')),
						E('th', { 'class': 'th' }, _('已用')),
						E('th', { 'class': 'th' }, _('空闲空间')),
						E('th', { 'class': 'th' }, _('使用率')),
						E('th', { 'class': 'th' }, _('挂载点')),
						E('th', { 'class': 'th' }, _('文件系统')),
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
									ui.addNotification(null, E('p', {}, _('起始或终止扇区无效！')));
									return;
								}
								ui.showModal(_('正在创建分区'), [ E('p', { 'class': 'spinning' }, _('正在创建新分区...')) ]);
								callCreatePartition(devName, sSec, eSec, 'primary').then(function(res) {
									if (res && res.code !== 0) {
										ui.addNotification(null, E('p', {}, res.error || _('创建分区失败。')));
									}
									self.renderPartitionDetailView(container, devName, data);
								});
							}
						}, _('新建'));

						partTable.appendChild(E('tr', { 'class': 'tr', 'style': 'background-color:rgba(255,255,255,0.03);' }, [
							E('td', { 'class': 'td', 'style': 'font-style:italic; color:#888;' }, _('空闲空间')),
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
						var isExtended = (part.type === 'extended' || part.fs === 'extended');
						var formatBtn;
						if (!isMounted && !isExtended && part.type !== 'free') {
							formatBtn = E('button', {
								'class': 'btn cbi-button cbi-button-reset',
								'click': function(ev) {
									ev.preventDefault();
									self.showFormatModal(part.name, formatCmds, part.fs, function() {
										self.renderPartitionDetailView(container, devName, data);
									});
								}
							}, (part.fs === 'raw' ? _('格式化') : part.fs.toUpperCase()));
						} else {
							formatBtn = E('span', {}, isExtended ? _('扩展分区') : part.fs);
						}

						var hasLogicals = partitions.some(function(p){ return p.type === 'logical'; });
						var removeDisabled = isMounted || (isExtended && hasLogicals);

						var removeBtn = E('button', {
							'class': 'btn cbi-button cbi-button-remove',
							'disabled': removeDisabled,
							'click': function(ev) {
								ev.preventDefault();
								if (!confirm(_('确定要删除分区 %s 吗？').format(part.name))) return;
								ui.showModal(_('正在删除分区'), [ E('p', { 'class': 'spinning' }, _('正在删除分区...')) ]);
								callRemovePartition(devName, part.number).then(function(res) {
									if (res && res.code !== 0) {
										ui.addNotification(null, E('p', {}, res.error || _('删除分区失败。')));
									}
									self.renderPartitionDetailView(container, devName, data);
								});
							}
						}, _('删除'));

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

			container.appendChild(viewRoot);
		});
	},

	renderBtrfsDetailView: function(container, uuid, data) {
		var self = this;
		ui.showModal(_('加载中...'), [ E('p', { 'class': 'spinning' }, _('正在加载 Btrfs 信息...')) ]);

		Promise.all([
			callGetBtrfsInfo(uuid),
			callGetBtrfsSubvolumes(uuid)
		]).then(function(res) {
			ui.hideModal();
			dom.content(container, []);

			var info = res[0] || {};
			var subvolumes = res[1] || [];

			var viewRoot = E('div', { 'class': 'cbi-map' });

			// Header & Back Button
			var headerDiv = E('div', { 'style': 'display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;' }, [
				E('div', {}, [
					E('h2', { 'style': 'margin-bottom:0.25rem;' }, _('Btrfs 管理') + ' - ' + (info.label || uuid)),
					E('div', { 'class': 'cbi-map-descr' }, _('管理 Btrfs 文件系统、子卷与快照'))
				]),
				E('button', {
					'class': 'btn cbi-button cbi-button-link',
					'click': function() { self.renderOverview(container, data); }
				}, '« ' + _('返回概览'))
			]);
			viewRoot.appendChild(headerDiv);

			// Section: Btrfs Info
			var infoSection = E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Btrfs 信息'))
			]);

			var labelIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': info.label || '', 'style': 'max-width:180px; display:inline-block; margin-right:6px;' });
			var updateLabelBtn = E('button', {
				'class': 'btn cbi-button cbi-button-edit',
				'click': function(ev) {
					ev.preventDefault();
					ui.showModal(_('正在更新卷标'), [ E('p', { 'class': 'spinning' }, _('正在更新 Btrfs 文件系统卷标...')) ]);
					callBtrfsSetLabel(uuid, labelIn.value).then(function(res) {
						if (res && res.code !== 0) {
							ui.addNotification(null, E('p', {}, res.error || _('更新卷标失败。')));
						}
						self.renderBtrfsDetailView(container, uuid, data);
					});
				}
			}, _('更新'));

			var infoTable = E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, 'UUID'),
					E('th', { 'class': 'th' }, _('成员')),
					E('th', { 'class': 'th' }, _('数据')),
					E('th', { 'class': 'th' }, _('元数据')),
					E('th', { 'class': 'th' }, _('大小')),
					E('th', { 'class': 'th' }, _('已用')),
					E('th', { 'class': 'th' }, _('空闲空间')),
					E('th', { 'class': 'th' }, _('使用率')),
					E('th', { 'class': 'th center' }, _('卷标'))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, E('code', {}, info.uuid || uuid)),
					E('td', { 'class': 'td' }, info.members || '-'),
					E('td', { 'class': 'td' }, info.data_raid_level || '-'),
					E('td', { 'class': 'td' }, info.metadata_raid_lavel || '-'),
					E('td', { 'class': 'td' }, info.size_formated || '-'),
					E('td', { 'class': 'td' }, info.used_formated || '-'),
					E('td', { 'class': 'td' }, info.free_formated || '-'),
					E('td', { 'class': 'td' }, info.usage || '-'),
					E('td', { 'class': 'td center' }, [
						labelIn,
						updateLabelBtn
					])
				])
			]);
			infoSection.appendChild(infoTable);
			viewRoot.appendChild(infoSection);

			// Section: Subvolumes
			var subvSection = E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('子卷列表'))
			]);

			var subvTable = E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, 'ID'),
					E('th', { 'class': 'th' }, 'Top Level'),
					E('th', { 'class': 'th' }, 'UUID'),
					E('th', { 'class': 'th' }, _('路径')),
					E('th', { 'class': 'th center' }, _('设为默认')),
					E('th', { 'class': 'th center' }, '')
				])
			]);

			subvolumes.forEach(function(sv) {
				var isRoot = (sv.path === '/' || sv.id === '5');
				var isDefault = sv.default_subvolume;

				var setDefaultBtn = E('button', {
					'class': 'btn cbi-button cbi-button-edit',
					'disabled': isDefault,
					'click': function(ev) {
						ev.preventDefault();
						ui.showModal(_('正在设为默认'), [ E('p', { 'class': 'spinning' }, _('正在设置默认子卷...')) ]);
						callBtrfsSubvolSetDefault(uuid, sv.path).then(function(res) {
							if (res && res.code !== 0) {
								ui.addNotification(null, E('p', {}, res.error || _('设置默认子卷失败。')));
							}
							self.renderBtrfsDetailView(container, uuid, data);
						});
					}
				}, isDefault ? _('默认') : _('设为默认'));

				var deleteBtn = E('button', {
					'class': 'btn cbi-button cbi-button-remove',
					'disabled': isRoot || isDefault,
					'click': function(ev) {
						ev.preventDefault();
						if (!confirm(_('确定要删除子卷 %s 吗？').format(sv.path))) return;
						ui.showModal(_('正在删除子卷'), [ E('p', { 'class': 'spinning' }, _('正在删除子卷...')) ]);
						callBtrfsSubvolDelete(uuid, sv.path).then(function(res) {
							if (res && res.code !== 0) {
								ui.addNotification(null, E('p', {}, res.error || _('删除子卷失败。')));
							}
							self.renderBtrfsDetailView(container, uuid, data);
						});
					}
				}, _('删除'));

				subvTable.appendChild(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, sv.id),
					E('td', { 'class': 'td' }, sv.top_level || '-'),
					E('td', { 'class': 'td' }, sv.uuid ? E('code', {}, sv.uuid) : '-'),
					E('td', { 'class': 'td' }, E('strong', {}, sv.path)),
					E('td', { 'class': 'td center' }, setDefaultBtn),
					E('td', { 'class': 'td center' }, deleteBtn)
				]));
			});

			var newSubvPath = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': '/my_subvolume' });
			var createSubvBtn = E('button', {
				'class': 'btn cbi-button cbi-button-add',
				'click': function(ev) {
					ev.preventDefault();
					var p = newSubvPath.value;
					if (!p || !p.startsWith('/')) {
						ui.addNotification(null, E('p', {}, _('子卷路径必须以 \'/\' 开头！')));
						return;
					}
					ui.showModal(_('正在创建子卷'), [ E('p', { 'class': 'spinning' }, _('正在创建子卷...')) ]);
					callBtrfsSubvolCreate(uuid, p).then(function(res) {
						if (res && res.code !== 0) {
							ui.addNotification(null, E('p', {}, res.error || _('创建子卷失败。')));
						}
						self.renderBtrfsDetailView(container, uuid, data);
					});
				}
			}, _('创建'));

			subvTable.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'colspan': 3, 'style': 'font-style:italic; color:#888;' }, _('新建子卷')),
				E('td', { 'class': 'td' }, newSubvPath),
				E('td', { 'class': 'td center' }, '-'),
				E('td', { 'class': 'td center' }, createSubvBtn)
			]));

			subvSection.appendChild(subvTable);
			viewRoot.appendChild(subvSection);

			// Section: New Snapshot
			var snapSection = E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('新建快照'))
			]);

			var snapSrcIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': '/data' });
			var snapDstIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': '/.snapshot/data/20260101' });
			var snapRoCheck = E('input', { 'type': 'checkbox', 'checked': true });

			snapSection.appendChild(E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('来源目录')),
				E('div', { 'class': 'cbi-value-field' }, [
					snapSrcIn,
					E('div', { 'class': 'cbi-value-description' }, _('创建快照的来源路径（必须以 \'/\' 开头）'))
				])
			]));

			snapSection.appendChild(E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('只读')),
				E('div', { 'class': 'cbi-value-field' }, [
					E('label', {}, [
						snapRoCheck,
						' ' + _('创建为只读快照')
					])
				])
			]));

			snapSection.appendChild(E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, _('目标目录（可选）')),
				E('div', { 'class': 'cbi-value-field' }, [
					snapDstIn,
					E('div', { 'class': 'cbi-value-description' }, _('存放快照的目标路径'))
				])
			]));

			snapSection.appendChild(E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, ''),
				E('div', { 'class': 'cbi-value-field' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-add',
						'click': function(ev) {
							ev.preventDefault();
							var src = snapSrcIn.value;
							if (!src || !src.startsWith('/')) {
								ui.addNotification(null, E('p', {}, _('请输入快照来源路径，必须以 \'/\' 开头！')));
								return;
							}
							ui.showModal(_('正在创建快照'), [ E('p', { 'class': 'spinning' }, _('正在创建 Btrfs 快照...')) ]);
							callBtrfsSnapshotCreate(uuid, src, snapDstIn.value || '', snapRoCheck.checked).then(function(res) {
								if (res && res.code !== 0) {
									ui.addNotification(null, E('p', {}, res.error || _('创建快照失败。')));
								}
								self.renderBtrfsDetailView(container, uuid, data);
							});
						}
					}, _('创建快照'))
				])
			]));

			viewRoot.appendChild(snapSection);
			container.appendChild(viewRoot);
		});
	},

	renderOverview: function(container, data) {
		var self = this;
		var devices = data[0] || {};
		var mountPoints = data[1] || [];
		var raidDevices = data[2] || {};
		var btrfsDevices = data[3] || {};

		dom.content(container, []);

		var viewRoot = E('div', { 'class': 'cbi-map' });

		// Page Header
		var headerDiv = E('div', { 'style': 'margin-bottom:1rem;' }, [
			E('h2', { 'style': 'margin-bottom:0.25rem;' }, _('DiskBox 磁盘管理')),
			E('div', { 'class': 'cbi-map-descr', 'style': 'margin-bottom:0.75rem;' }, _('通过 LuCI 管理磁盘')),
			E('div', { 'style': 'margin-bottom:1.5rem;' }, [
				E('button', {
					'class': 'cbi-button cbi-button-add',
					'click': function(ev) {
						ev.preventDefault();
						ui.showModal(_('重新扫描'), [
							E('p', { 'class': 'spinning' }, _('正在重新扫描 SCSI 与 RAID 设备...'))
						]);
						callRescanDisks().then(function() {
							location.reload();
						});
					}
				}, _('重新扫描磁盘'))
			])
		]);
		viewRoot.appendChild(headerDiv);

		// Section: Disks
		var disksSection = E('div', { 'class': 'cbi-section' }, [
			E('legend', {}, _('磁盘'))
		]);

		var disksTable = E('table', { 'class': 'table cbi-section-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, _('路径')),
				E('th', { 'class': 'th' }, _('型号')),
				E('th', { 'class': 'th' }, _('序列号')),
				E('th', { 'class': 'th' }, _('大小')),
				E('th', { 'class': 'th' }, _('温度')),
				E('th', { 'class': 'th' }, _('分区表')),
				E('th', { 'class': 'th' }, _('SATA 版本')),
				E('th', { 'class': 'th' }, _('健康状态')),
				E('th', { 'class': 'th center' }, '')
			])
		]);

		var devKeys = Object.keys(devices);
		if (devKeys.length === 0) {
			disksTable.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'colspan': 9, 'style': 'text-align:center; font-style:italic; padding:1.5rem;' }, _('未找到磁盘设备。'))
			]));
		} else {
			devKeys.sort().forEach(function(devName) {
				var dev = devices[devName];
				var healthContent = E('div', {}, [
					E('div', {}, dev.health_status || '-'),
					dev.inuse ? E('div', { 'style': 'color:#2dce89; font-size:11px;' }, 'ACTIVE') : E('div', { 'style': 'color:#888; font-size:11px;' }, 'STANDBY')
				]);

				var row = E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, E('strong', {}, dev.path)),
					E('td', { 'class': 'td' }, dev.model || '-'),
					E('td', { 'class': 'td' }, dev.sn || '-'),
					E('td', { 'class': 'td' }, dev.size_formated || '-'),
					E('td', { 'class': 'td' }, dev.temp || '-'),
					E('td', { 'class': 'td' }, dev.p_table || '-'),
					E('td', { 'class': 'td' }, dev.sata_ver || '-'),
					E('td', { 'class': 'td' }, healthContent),
					E('td', { 'class': 'td center' }, [
						E('button', {
							'class': 'btn cbi-button cbi-button-action',
							'click': function() { self.renderPartitionDetailView(container, devName, data); }
						}, _('编辑'))
					])
				]);
				disksTable.appendChild(row);

				var barRow = self.renderPartitionRow(devName, 9);
				disksTable.appendChild(barRow);
			});
		}
		disksSection.appendChild(disksTable);
		viewRoot.appendChild(disksSection);

		// Section: RAID Devices
		var raidKeys = Object.keys(raidDevices);
		if (raidKeys.length > 0) {
			var raidSection = E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('RAID 设备'))
			]);
			var raidTable = E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('路径')),
					E('th', { 'class': 'th' }, _('RAID 模式')),
					E('th', { 'class': 'th' }, _('大小')),
					E('th', { 'class': 'th' }, _('分区表')),
					E('th', { 'class': 'th' }, _('状态')),
					E('th', { 'class': 'th' }, _('成员')),
					E('th', { 'class': 'th' }, _('活动')),
					E('th', { 'class': 'th center' }, '')
				])
			]);

			raidKeys.forEach(function(rName) {
				var r = raidDevices[rName];
				raidTable.appendChild(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, E('strong', {}, r.path)),
					E('td', { 'class': 'td' }, r.level || '-'),
					E('td', { 'class': 'td' }, r.size_formated || '-'),
					E('td', { 'class': 'td' }, '-'),
					E('td', { 'class': 'td' }, r.status || '-'),
					E('td', { 'class': 'td' }, r.members_str || '-'),
					E('td', { 'class': 'td' }, r.active || '-'),
					E('td', { 'class': 'td center' }, [
						E('button', {
							'class': 'btn cbi-button cbi-button-action',
							'click': function() { self.renderPartitionDetailView(container, rName, data); }
						}, _('编辑'))
					])
				]));
				var barRow = self.renderPartitionRow(rName, 8);
				raidTable.appendChild(barRow);
			});
			raidSection.appendChild(raidTable);
			viewRoot.appendChild(raidSection);
		}

		// Section: Btrfs Devices
		var btrfsKeys = Object.keys(btrfsDevices);
		if (btrfsKeys.length > 0) {
			var btrfsSection = E('div', { 'class': 'cbi-section' }, [
				E('legend', {}, _('Btrfs'))
			]);
			var btrfsTable = E('table', { 'class': 'table cbi-section-table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, 'UUID'),
					E('th', { 'class': 'th' }, _('卷标')),
					E('th', { 'class': 'th' }, _('成员')),
					E('th', { 'class': 'th' }, _('使用情况')),
					E('th', { 'class': 'th center' }, '')
				])
			]);

			btrfsKeys.forEach(function(uKey) {
				var b = btrfsDevices[uKey];
				btrfsTable.appendChild(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, E('code', {}, b.uuid)),
					E('td', { 'class': 'td' }, b.label || '-'),
					E('td', { 'class': 'td' }, b.members || '-'),
					E('td', { 'class': 'td' }, b.used_formated || '-'),
					E('td', { 'class': 'td center' }, [
						E('button', {
							'class': 'btn cbi-button cbi-button-action',
							'click': function() { self.renderBtrfsDetailView(container, b.uuid, data); }
						}, _('编辑'))
					])
				]));
			});
			btrfsSection.appendChild(btrfsTable);
			viewRoot.appendChild(btrfsSection);
		}

		// Section: Mount Points
		var mountSection = E('div', { 'class': 'cbi-section' }, [
			E('legend', {}, _('挂载点'))
		]);
		var mountTable = E('table', { 'class': 'table cbi-section-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, _('设备')),
				E('th', { 'class': 'th' }, _('文件系统')),
				E('th', { 'class': 'th' }, _('挂载选项')),
				E('th', { 'class': 'th' }, _('挂载点')),
				E('th', { 'class': 'th center' }, _('挂载'))
			])
		]);

		mountPoints.forEach(function(mp) {
			mountTable.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td' }, mp.device),
				E('td', { 'class': 'td' }, mp.fs),
				E('td', { 'class': 'td', 'style': 'word-break:break-all; max-width:300px;' }, mp.mount_options),
				E('td', { 'class': 'td' }, E('code', {}, mp.mount_point)),
				E('td', { 'class': 'td center' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-remove',
						'click': function(ev) {
							ev.preventDefault();
							if (!confirm(_('确定要卸载 %s 吗？').format(mp.mount_point))) return;
							ui.showModal(_('正在卸载'), [ E('p', { 'class': 'spinning' }, _('正在卸载 %s...').format(mp.mount_point)) ]);
							callUmount(mp.mount_point).then(function(res) {
								if (res && res.code !== 0) {
									ui.addNotification(null, E('p', {}, res.error || _('卸载失败。')));
								}
								location.reload();
							});
						}
					}, _('卸载'))
				])
			]));
		});

		var devSelect = E('select', { 'class': 'cbi-input-select' });
		devSelect.appendChild(E('option', { 'value': '' }, '-- ' + _('请选择') + ' --'));
		devKeys.forEach(function(dKey) {
			var dev = devices[dKey];
			if (dev.partitions && dev.partitions.length > 0) {
				dev.partitions.forEach(function(p) {
					devSelect.appendChild(E('option', { 'value': p.path }, p.path + ' ' + p.size_formated));
				});
			} else {
				devSelect.appendChild(E('option', { 'value': dev.path }, dev.path + ' ' + dev.size_formated));
			}
		});

		var fsSelect = E('select', { 'class': 'cbi-input-select' }, [
			E('option', { 'value': 'auto', 'selected': 'selected' }, 'auto'),
			E('option', { 'value': 'ext4' }, 'ext4'),
			E('option', { 'value': 'ext3' }, 'ext3'),
			E('option', { 'value': 'ext2' }, 'ext2'),
			E('option', { 'value': 'vfat' }, 'vfat'),
			E('option', { 'value': 'exfat' }, 'exfat'),
			E('option', { 'value': 'ntfs' }, 'ntfs'),
			E('option', { 'value': 'btrfs' }, 'btrfs')
		]);
		var optsInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': 'rw,noauto', 'value': 'rw,noauto' });
		var mpInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': '/media/diskX' });

		mountTable.appendChild(E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td' }, devSelect),
			E('td', { 'class': 'td' }, fsSelect),
			E('td', { 'class': 'td' }, optsInput),
			E('td', { 'class': 'td' }, mpInput),
			E('td', { 'class': 'td center' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-add',
					'click': function(ev) {
						ev.preventDefault();
						var selDev = devSelect.value;
						var selMp = mpInput.value;
						if (!selDev || !selMp) {
							ui.addNotification(null, E('p', {}, _('必须填写设备和挂载点！')));
							return;
						}
						ui.showModal(_('正在挂载'), [ E('p', { 'class': 'spinning' }, _('正在挂载设备...')) ]);
						callMount(selDev, selMp, fsSelect.value || 'auto', optsInput.value || '').then(function(res) {
							if (res && res.code !== 0) {
								ui.addNotification(null, E('p', {}, res.error || _('挂载失败。')));
							}
							location.reload();
						});
					}
				}, _('挂载'))
			])
		]));

		mountSection.appendChild(mountTable);
		viewRoot.appendChild(mountSection);

		// Section: Creation
		var createSection = E('div', { 'class': 'cbi-section' }, [
			E('legend', {}, _('创建'))
		]);

		var tabHead = E('ul', { 'class': 'cbi-tabmenu', 'style': 'margin-bottom:0;' });
		var tabRaidHead = E('li', { 'class': 'cbi-tab active' }, [ E('a', { 'href': '#' }, 'RAID') ]);
		var tabBtrfsHead = E('li', { 'class': 'cbi-tab' }, [ E('a', { 'href': '#' }, 'Btrfs') ]);
		tabHead.appendChild(tabRaidHead);
		tabHead.appendChild(tabBtrfsHead);
		createSection.appendChild(tabHead);

		// Tab 1: RAID Body
		var tabRaidBody = E('div', { 'class': 'cbi-tabcontainer', 'style': 'padding:1.25rem 0.5rem; display:block;' });
		tabRaidBody.appendChild(E('h4', { 'style': 'margin-top:0; margin-bottom:1.25rem; font-weight:normal;' }, _('RAID 创建')));

		var rNameIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'style': 'max-width:260px;', 'placeholder': '/dev/md0', 'value': '/dev/md0' });
		var rLevelSel = E('select', { 'class': 'cbi-input-select', 'style': 'max-width:260px;' }, [
			E('option', { 'value': 'linear', 'selected': 'selected' }, 'Linear'),
			E('option', { 'value': '5' }, 'Raid 5'),
			E('option', { 'value': '6' }, 'Raid 6'),
			E('option', { 'value': '1' }, 'Raid 1'),
			E('option', { 'value': '0' }, 'Raid 0'),
			E('option', { 'value': '10' }, 'Raid 10')
		]);

		var rMemberSelect = E('select', { 'class': 'cbi-input-select', 'style': 'max-width:260px;' });
		rMemberSelect.appendChild(E('option', { 'value': '' }, '-- ' + _('请选择') + ' --'));
		devKeys.forEach(function(dKey) {
			var dev = devices[dKey];
			if (dev.partitions && dev.partitions.length > 0) {
				dev.partitions.forEach(function(p) {
					if (!p.inuse) {
						rMemberSelect.appendChild(E('option', { 'value': p.path }, p.path + ' ' + p.size_formated));
					}
				});
			} else if (!dev.inuse) {
				rMemberSelect.appendChild(E('option', { 'value': dev.path }, dev.path + ' ' + dev.size_formated));
			}
		});

		tabRaidBody.appendChild(E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('RAID 名称')),
			E('div', { 'class': 'cbi-value-field' }, rNameIn)
		]));
		tabRaidBody.appendChild(E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('RAID 级别')),
			E('div', { 'class': 'cbi-value-field' }, rLevelSel)
		]));
		tabRaidBody.appendChild(E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('磁盘阵列成员')),
			E('div', { 'class': 'cbi-value-field' }, rMemberSelect)
		]));
		tabRaidBody.appendChild(E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, ''),
			E('div', { 'class': 'cbi-value-field' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-add',
					'click': function(ev) {
						ev.preventDefault();
						var selMember = rMemberSelect.value;
						if (!selMember) {
							ui.addNotification(null, E('p', {}, _('请选择磁盘阵列成员！')));
							return;
						}
						ui.showModal(_('正在创建 RAID'), [ E('p', { 'class': 'spinning' }, _('正在创建 RAID 阵列...')) ]);
						callCreateRaid(rNameIn.value || '/dev/md0', rLevelSel.value, [selMember]).then(function(res) {
							if (res && res.code !== 0) {
								ui.addNotification(null, E('p', {}, res.error || _('创建 RAID 失败。')));
							}
							location.reload();
						});
					}
				}, _('创建 RAID'))
			])
		]));
		createSection.appendChild(tabRaidBody);

		// Tab 2: Btrfs Body
		var tabBtrfsBody = E('div', { 'class': 'cbi-tabcontainer', 'style': 'padding:1.25rem 0.5rem; display:none;' });
		tabBtrfsBody.appendChild(E('h4', { 'style': 'margin-top:0; margin-bottom:1.25rem; font-weight:normal;' }, _('Btrfs 创建')));

		var bLabelIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'style': 'max-width:260px;', 'placeholder': 'data', 'value': 'data' });
		var bLevelSel = E('select', { 'class': 'cbi-input-select', 'style': 'max-width:260px;' }, [
			E('option', { 'value': 'single', 'selected': 'selected' }, 'Single'),
			E('option', { 'value': 'raid0' }, 'Raid 0'),
			E('option', { 'value': 'raid1' }, 'Raid 1'),
			E('option', { 'value': 'raid10' }, 'Raid 10')
		]);

		var bMemberSelect = E('select', { 'class': 'cbi-input-select', 'style': 'max-width:260px;' });
		bMemberSelect.appendChild(E('option', { 'value': '' }, '-- ' + _('请选择') + ' --'));
		devKeys.forEach(function(dKey) {
			var dev = devices[dKey];
			if (dev.partitions && dev.partitions.length > 0) {
				dev.partitions.forEach(function(p) {
					if (!p.inuse) {
						bMemberSelect.appendChild(E('option', { 'value': p.path }, p.path + ' ' + p.size_formated));
					}
				});
			} else if (!dev.inuse) {
				bMemberSelect.appendChild(E('option', { 'value': dev.path }, dev.path + ' ' + dev.size_formated));
			}
		});

		tabBtrfsBody.appendChild(E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('Btrfs 卷标')),
			E('div', { 'class': 'cbi-value-field' }, bLabelIn)
		]));
		tabBtrfsBody.appendChild(E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('Btrfs Raid 级别')),
			E('div', { 'class': 'cbi-value-field' }, bLevelSel)
		]));
		tabBtrfsBody.appendChild(E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, _('Btrfs 阵列成员')),
			E('div', { 'class': 'cbi-value-field' }, bMemberSelect)
		]));
		tabBtrfsBody.appendChild(E('div', { 'class': 'cbi-value' }, [
			E('label', { 'class': 'cbi-value-title' }, ''),
			E('div', { 'class': 'cbi-value-field' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-add',
					'click': function(ev) {
						ev.preventDefault();
						var selMember = bMemberSelect.value;
						if (!selMember) {
							ui.addNotification(null, E('p', {}, _('请选择 Btrfs 阵列成员！')));
							return;
						}
						ui.showModal(_('正在创建 Btrfs'), [ E('p', { 'class': 'spinning' }, _('正在创建 Btrfs 文件系统...')) ]);
						callCreateBtrfs(bLabelIn.value || 'data', bLevelSel.value, [selMember]).then(function(res) {
							if (res && res.code !== 0) {
								ui.addNotification(null, E('p', {}, res.error || _('创建 Btrfs 失败。')));
							}
							location.reload();
						});
					}
				}, _('创建 Btrfs'))
			])
		]));
		createSection.appendChild(tabBtrfsBody);

		function switchTab(tabName) {
			if (tabName === 'raid') {
				tabRaidHead.className = 'cbi-tab active';
				tabBtrfsHead.className = 'cbi-tab';
				tabRaidBody.style.display = 'block';
				tabBtrfsBody.style.display = 'none';
			} else {
				tabRaidHead.className = 'cbi-tab';
				tabBtrfsHead.className = 'cbi-tab active';
				tabRaidBody.style.display = 'none';
				tabBtrfsBody.style.display = 'block';
			}
		}

		tabRaidHead.querySelector('a').addEventListener('click', function(e) {
			e.preventDefault();
			switchTab('raid');
		});

		tabBtrfsHead.querySelector('a').addEventListener('click', function(e) {
			e.preventDefault();
			switchTab('btrfs');
		});

		viewRoot.appendChild(createSection);
		container.appendChild(viewRoot);
	},

	render: function(data) {
		var container = E('div');
		this.renderOverview(container, data);
		return container;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});

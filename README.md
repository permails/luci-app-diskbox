# LuCI DiskBox (luci-app-diskbox)

- **A Modern Disk & Partition Manager for OpenWrt LuCI**
- **适用于 OpenWrt 24/25+ 的现代纯 JavaScript 架构磁盘管理插件**
- 完全移除 `luci-compat` 依赖，采用标准 RPCD 后端 + 纯前端客户端渲染架构。

## 特性 / Features
1. **磁盘概览与健康监控**：
   - 支持 SCSI/SATA (`sd*`), NVMe (`nvme*`), MMC/eMMC (`mmcblk*`), VirtIO (`vd*`) 等多类型存储设备。
   - 自动获取 S.M.A.R.T 温度、健康状态与序列号，针对 eMMC 设备智能读取寿命与磨损级别。
   - 彩色分区布局条直观展示磁盘分区使用情况。
   - S.M.A.R.T 详情通过现代模态弹窗查看，关键坏道指标（05/C5）高亮告警。
2. **分区管理**：
   - 支持 GPT 与 MBR 分区表创建与切换。
   - 新建分区支持 2048 扇区最优对齐与 `+500M`/`+10G`/`+1T` 等容量格式。
   - 支持格式化为 ext2/ext3/ext4/fat32/exfat/ntfs/swap/btrfs。
3. **软 RAID (mdadm) 支持**：
   - 支持 Linear, RAID 0, RAID 1, RAID 5, RAID 6, RAID 10 的创建与管理。
   - 自动更新 UCI 配置并在开机时自动装配。
4. **Btrfs 多设备与快照管理**：
   - 支持多盘 Btrfs 阵列创建（Single/RAID0/RAID1/RAID10）。
   - 子卷查看、新建、删除以及设为默认子卷。
   - 支持只读/读写快照的快速生成。
5. **挂载点管理**：
   - 实时读取已挂载设备并支持一键安全卸载。
   - 支持指定文件系统与挂载参数快速挂载新设备。

## 依赖 / Depends
- `e2fsprogs`
- `parted`
- `smartmontools`
- `blkid`
- `btrfs-progs` (可选)
- `lsblk` (可选)
- `mdadm` (可选)
- `*(不需要任何 luci-compat)*`

## 目录结构
```
applications/luci-app-diskbox/
├── Makefile
├── htdocs/
│   └── luci-static/resources/view/diskbox/
│       ├── disks.js
│       ├── partition.js
│       └── btrfs.js
├── root/
│   ├── usr/libexec/rpcd/luci.diskbox
│   └── usr/share/
│       ├── luci/menu.d/luci-app-diskbox.json
│       └── rpcd/acl.d/luci-app-diskbox.json
└── po/
```

## 作者 / Author
- **permails** (<https://github.com/permails/luci-app-diskbox>)

## 许可证 / License
- AGPL-3.0 License


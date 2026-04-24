# Ubuntu 22.04 开发环境搭建指南

本文档记录在 Ubuntu 22.04 上搭建 MarkLite 开发环境的完整步骤。

---

## 一、用户态工具链（无需 sudo）

以下均已在本机安装完成，新成员在同一台机器上只需确认版本即可。

### 1. nvm

```bash
git clone https://github.com/nvm-sh/nvm.git "$HOME/.nvm"
cd "$HOME/.nvm" && git checkout v0.40.3
```

在 `~/.bashrc` 末尾添加（安装脚本会自动写入，手动安装需补充）：

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

### 2. Node.js 22.16.0

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22.16.0
nvm alias default 22.16.0
nvm use 22.16.0
```

> 注：仓库 `.nvmrc` 标注的默认版本为 `20`，项目在 `22.16.0` 下已验证可正常构建。

### 3. Yarn Classic 1.22

```bash
npm install -g yarn@1.22.22
```

验证：

```bash
yarn -v   # 应输出 1.22.22
```

### 4. Rust stable

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"
rustup default stable
```

验证：

```bash
rustc --version   # rustc 1.95.0 或更高
cargo --version
```

---

## 二、Ubuntu 系统依赖（需要 sudo）

Tauri 在 Linux 上需要以下系统级原生库，**缺少这些包会导致 `yarn tauri dev` 编译失败（exit code 101）**，错误表现为找不到 `pango`、`atk`、`cairo`、`gdk-3.0`、`gdk-pixbuf-2.0`。

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

> ⚠️ Ubuntu 22.04 已将系统托盘库迁移到 `libayatana-appindicator3-dev`，使用旧包名 `libappindicator3-dev` 会触发 `Conflicts: libayatana-appindicator3-1` 冲突错误。

| 包名 | 用途 |
|------|------|
| `libwebkit2gtk-4.1-dev` | Tauri/Linux WebView 引擎，含 GTK 底层依赖（pango、atk、cairo 等） |
| `librsvg2-dev` | SVG 渲染，Tauri `yarn tauri info` 明确报告缺失 |
| `libayatana-appindicator3-dev` | 系统托盘图标支持（Ubuntu 22.04+ 专用包名） |
| `patchelf` | AppImage 打包和 glibc 兼容性修补 |

---

## 二·五、已知 Linux 渲染问题

### WebKit2GTK DMA-BUF 黑屏

**症状**：`yarn tauri dev` 启动后窗口黑屏，终端输出：

```
KMS: DRM_IOCTL_MODE_CREATE_DUMB failed: Permission denied
Failed to create GBM buffer of size 1280x800: Permission denied
```

**原因**：WebKit2GTK 的 DMA-BUF 渲染后端尝试直接访问 DRM/KMS 设备，在没有 GPU 直接访问权限的环境（无头服务器、部分 VM、受限 CI 环境）下失败。

**修复**：项目根目录已包含 `.env` 文件，Tauri CLI 会自动读取并注入以下环境变量，禁用 DMA-BUF 渲染器，回退到软件渲染：

```
WEBKIT_DISABLE_DMABUF_RENDERER=1
```

无需手动操作；执行 `yarn tauri dev` 时该变量已自动生效。

---

## 三、项目依赖安装

```bash
cd /home/sensor/kevin/md-client
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22.16.0
yarn install --frozen-lockfile
```

> 如果安装过程中出现 `Extracting tar content of undefined failed` 错误，执行以下命令清理缓存后重试：
>
> ```bash
> yarn cache clean
> yarn install --frozen-lockfile
> ```

---

## 四、验证环境

### 前端构建验证

```bash
cd /home/sensor/kevin/md-client
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22.16.0
yarn build
```

预期：`✓ built in xx.xxs`，并在 `dist/` 和 `resources/plugins/` 生成产物。

### 桌面端完整验证

```bash
cd /home/sensor/kevin/md-client
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22.16.0
. "$HOME/.cargo/env"
yarn tauri dev
```

首次运行会编译 Rust crate，耗时较长（5~15 分钟），后续增量编译会快很多。

---

## 五、已验证版本清单

| 工具 | 版本 | 状态 |
|------|------|------|
| OS | Ubuntu 22.04 x86_64 | ✅ |
| Node.js | 22.16.0 | ✅ |
| npm | 10.9.2 | ✅ |
| Yarn | 1.22.22 | ✅ |
| rustc | 1.95.0 | ✅ |
| cargo | 1.95.0 | ✅ |
| libwebkit2gtk-4.1-dev | 2.50.4 | ✅ |
| librsvg2-dev | 2.52.5 | ✅ |
| libayatana-appindicator3-dev | 0.5.90 | ✅ |
| patchelf | — | ✅ |
| yarn build | ✓ built in 11s | ✅ |
| yarn tauri dev | Finished dev, Running marklite | ✅ |

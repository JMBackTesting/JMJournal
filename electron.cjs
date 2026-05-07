const { app, BrowserWindow, Menu, MenuItem } = require('electron')
const path = require('path')
require('dotenv').config()

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  win.webContents.on('context-menu', (event, params) => {
    if (params.mediaType === 'image' && params.srcURL) {
      const menu = new Menu()
      menu.append(new MenuItem({
        label: 'Copy Image',
        click: () => {
          win.webContents.copyImageAt(params.x, params.y)
        }
      }))
      menu.append(new MenuItem({
        label: 'Copy Image URL',
        click: () => {
          require('electron').clipboard.writeText(params.srcURL)
        }
      }))
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({
        label: 'Open Image in Browser',
        click: () => {
          require('electron').shell.openExternal(params.srcURL)
        }
      }))
      menu.popup({ window: win })
    }
  })
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
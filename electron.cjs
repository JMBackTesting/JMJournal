const { app, BrowserWindow, Notification } = require('electron')
const path = require('path')
require('dotenv').config()

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
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
}

function shouldFireToday(task) {
  const recurrence = task.tags?.[0] || 'Once'
  const start = new Date(task.date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const diffDays = Math.floor((today - startDay) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return false
  if (recurrence === 'Once') return diffDays === 0
  if (recurrence === 'Every day') return true
  if (recurrence === 'Every other day') return diffDays % 2 === 0
  if (recurrence === 'Weekly') return diffDays % 7 === 0
  if (recurrence === 'Monthly') return start.getDate() === today.getDate()
  return false
}

function isDoneToday(task) {
  if (!task.last_completed_date) return false
  const today = new Date().toISOString().split('T')[0]
  return task.last_completed_date === today
}

function checkNotifications() {
  const now = new Date()
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_KEY

  fetch(supabaseUrl + '/rest/v1/tasks?select=*', {
    headers: {
      'apikey': supabaseKey,
      'Authorization': 'Bearer ' + supabaseKey
    }
  })
  .then(r => r.json())
  .then(tasks => {
    tasks.forEach(task => {
      if (task.scheduled_time === currentTime && !isDoneToday(task) && shouldFireToday(task)) {
        const notif = new Notification({
          title: 'JM Trading',
          subtitle: 'Task Reminder',
          body: task.text,
          sound: 'Blow',
          urgency: 'critical'
        })
        notif.show()
        notif.on('click', () => {
          if (win) { win.show(); win.focus() }
        })
      }
    })
  })
  .catch(() => {})
}

app.whenReady().then(() => {
  createWindow()
  setInterval(checkNotifications, 60000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

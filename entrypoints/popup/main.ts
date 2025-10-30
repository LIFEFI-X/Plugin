import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { loadPoppinsFonts } from '@/utils/fonts'
import '@/assets/main.css'
import './style.css'

// Load Poppins fonts
loadPoppinsFonts()

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.mount('#app')

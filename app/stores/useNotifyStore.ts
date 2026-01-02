import { defineStore } from 'pinia'

export const useNotifyStore = defineStore('notify', {
  state: () => ({
    show: false,
    message: '',
    color: 'success' as 'success' | 'error' | 'warning' | 'info'
  }),

  actions: {
    success(msg: string) {
      this.message = msg
      this.color = 'success'
      this.show = true
    },
    error(msg: string) {
      this.message = msg
      this.color = 'error'
      this.show = true
    },
    warning(msg: string) {
      this.message = msg
      this.color = 'warning'
      this.show = true
    }
  }
})

import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    test: 'Pinia OK'
  })
})

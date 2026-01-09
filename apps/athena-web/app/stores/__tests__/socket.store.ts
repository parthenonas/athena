import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useSocketStore } from '../socket.store'

mockNuxtImport('useRuntimeConfig', () => {
  return () => ({
    public: {
      wsUrl: 'http://localhost:3000'
    }
  })
})

type EventHandler = (...args: unknown[]) => void
const eventHandlers: Record<string, EventHandler> = {}

const socketMock = {
  id: 'mock-socket-id',
  connected: false,
  on: vi.fn((event: string, handler: EventHandler) => {
    eventHandlers[event] = handler
  }),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn()
}

vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(() => socketMock)
  }
})

describe('Socket Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    socketMock.connected = false
    socketMock.id = 'mock-socket-id'

    // eslint-disable-next-line
    for (const key in eventHandlers) delete eventHandlers[key]
  })

  it('should have initial state disconnected', () => {
    const store = useSocketStore()

    expect(store.socket).toBeNull()
    expect(store.isConnected).toBe(false)
    expect(store.socketId).toBeNull()
  })

  it('connect() should initialize socket and setup listeners', () => {
    const store = useSocketStore()

    store.connect()

    expect(store.socket).not.toBeNull()

    expect(socketMock.on).toHaveBeenCalledWith('connect', expect.any(Function))
    expect(socketMock.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
    expect(socketMock.on).toHaveBeenCalledWith('connect_error', expect.any(Function))
  })

  it('should update state when "connect" event fires', () => {
    const store = useSocketStore()
    store.connect()

    const onConnect = eventHandlers['connect']!
    expect(onConnect).toBeDefined()

    onConnect()

    expect(store.isConnected).toBe(true)
    expect(store.socketId).toBe('mock-socket-id')
  })

  it('should update state when "disconnect" event fires', () => {
    const store = useSocketStore()
    store.connect()

    const onConnect = eventHandlers['connect']!
    onConnect()
    expect(store.isConnected).toBe(true)

    const onDisconnect = eventHandlers['disconnect']!
    expect(onDisconnect).toBeDefined()

    onDisconnect()

    expect(store.isConnected).toBe(false)
    expect(store.socketId).toBeNull()
  })

  it('disconnect() action should clean up state and call socket.disconnect()', () => {
    const store = useSocketStore()
    store.connect()

    store.disconnect()

    expect(socketMock.disconnect).toHaveBeenCalled()
    expect(store.socket).toBeNull()
    expect(store.isConnected).toBe(false)
    expect(store.socketId).toBeNull()
  })

  it('should not connect again if already connected', () => {
    const store = useSocketStore()
    store.connect()

    socketMock.connected = true
    store.connect()

    // eslint-disable-next-line
    const { io } = require('socket.io-client')
    expect(io).toHaveBeenCalledTimes(1)
  })

  it('proxy methods (on, off, emit) should delegate to socket instance', () => {
    const store = useSocketStore()
    store.connect()

    const callback = vi.fn()

    store.on('test-event', callback)
    expect(socketMock.on).toHaveBeenCalledWith('test-event', callback)

    store.off('test-event', callback)
    expect(socketMock.off).toHaveBeenCalledWith('test-event', callback)

    store.emit('send-data', { foo: 'bar' })
    expect(socketMock.emit).toHaveBeenCalledWith('send-data', { foo: 'bar' })
  })

  it('proxy methods should warn/do nothing if socket is null', () => {
    const store = useSocketStore()

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    store.on('test', () => {})
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Socket not initialized'))

    expect(() => store.emit('test')).not.toThrow()
    expect(() => store.off('test')).not.toThrow()
    expect(socketMock.emit).not.toHaveBeenCalled()
  })
})

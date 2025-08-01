import AsyncStorage from '@react-native-async-storage/async-storage'
import { requestPermissions } from '@utils/permissions/bluetooth'
import { SCALE_SERVICES } from '../constants/ScaleServices'
import BluetoothScaleService from './BluetoothScaleService'
import EtekcityScaleService from './EtekcityBluetoothService'
import EventEmitterService from './EventEmitterService'
import LefuScaleService from './LefuScaleService'
import MockScaleService from './MockScaleService'

class ScaleServiceFactory {
	static instance = null
	static services = {
		[SCALE_SERVICES.MOCK]: null,
		[SCALE_SERVICES.ETEKCITY]: null,
		[SCALE_SERVICES.BLUETOOTH]: null,
		[SCALE_SERVICES.LEFU]: null,
	}
	static currentDevice = null
	static isConnected = false

	static async getScaleService() {
		try {
			const selectedScale =
				(await AsyncStorage.getItem('selectedScale')) || SCALE_SERVICES.MOCK

			// Only initialize the service if it hasn't been initialized yet
			if (!this.services[selectedScale]) {
				switch (selectedScale) {
					case SCALE_SERVICES.ETEKCITY:
						this.services[selectedScale] = EtekcityScaleService
						break
					case SCALE_SERVICES.BLUETOOTH:
						this.services[selectedScale] = BluetoothScaleService
						break
					case SCALE_SERVICES.LEFU:
						this.services[selectedScale] = LefuScaleService
						break
					default:
						this.services[selectedScale] = MockScaleService
				}
			}

			return this.services[selectedScale]
		} catch (error) {
			console.error('Error getting scale service:', error)
			return MockScaleService
		}
	}

	static async setScaleService(scaleType) {
		try {
			await AsyncStorage.setItem('selectedScale', scaleType)

			// Clear the service instance when changing scale type
			this.services[scaleType] = null

			// Disconnect from current device if connected
			if (this.isConnected) {
				await this.disconnectFromScale()
			}
		} catch (error) {
			console.error('Error setting scale service:', error)
		}
	}

	static resetServices() {
		// Clear all service instances
		Object.keys(this.services).forEach((key) => {
			this.services[key] = null
		})
		this.currentDevice = null
		this.isConnected = false
	}

	static async connectToScale() {
		return new Promise(async (resolve, reject) => {
			const scaleService = await this.getScaleService()

			try {
				if (this.isConnected) {
					EventEmitterService.emit('connectionStatus', 'connected')
					resolve(this.currentDevice)
					return
				}

				EventEmitterService.emit('connectionStatus', 'connecting')
				// Checks for permissions
				await requestPermissions()
				// The startScan method in EtekcityBluetoothService now handles reconnection logic

				// WARNING, this does not actually rejects anything,
				// it is not a promise and will always resolves even if reject() !
				// Fix: Removal of try catch to allow error to bubble up to handlers.
				await scaleService.startScan(async (device) => {
					console.log('Found scale for reconnected:', device.name, device.id)

					const connectedDevice = await scaleService.connect(
						device,
						(weightData) => {
							this.emitWeightUpdate(weightData)
						}
					)
					this.isConnected = true
					this.currentDevice = connectedDevice
					EventEmitterService.emit('connectionStatus', 'connected')
					return connectedDevice
				})
			} catch (error) {
				console.error('Failed to initiate scale connection:', error)
				this.isConnected = false
				this.currentDevice = null
				EventEmitterService.emit('connectionStatus', 'connectionFailed')
				const errorMessage =
					error.message || 'An unknown error occurred during connection.'
				reject(new Error(errorMessage))
			}
		})
	}

	static async disconnectFromScale() {
		try {
			const scaleService = await this.getScaleService()
			if (this.currentDevice) {
				await scaleService.disconnect()
				this.currentDevice = null
				this.isConnected = false
				EventEmitterService.emit('connectionStatus', 'disconnected')
			}
		} catch (error) {
			console.error('Error disconnecting from scale:', error)
			// Even if disconnect fails, we should update the status
			this.isConnected = false
			this.currentDevice = null
			EventEmitterService.emit('connectionStatus', 'disconnected')
			throw error
		}
	}

	static subscribeToWeightUpdates(callback) {
		EventEmitterService.on('weightUpdate', callback)
		return () => EventEmitterService.off('weightUpdate', callback)
	}

	static emitWeightUpdate(weightData) {
		EventEmitterService.emit('weightUpdate', weightData)
	}

	static subscribeToConnectionStatus(callback) {
		EventEmitterService.on('connectionStatus', callback)
		return () => EventEmitterService.off('connectionStatus', callback)
	}

	static getConnectionStatus() {
		return {
			isConnected: this.isConnected,
			currentDevice: this.currentDevice,
		}
	}

	static unsubscribeAll() {
		// Clean up all subscriptions
		EventEmitterService.removeAllListeners('weightUpdate')
		EventEmitterService.removeAllListeners('connectionStatus')
	}

	static async isMockScaleSelected() {
		try {
			const selectedScale = await AsyncStorage.getItem('selectedScale')
			return selectedScale === SCALE_SERVICES.MOCK || selectedScale === null // Default to MOCK if not set
		} catch (error) {
			console.error('Error checking if mock scale is selected:', error)
			return true // Assume mock if error
		}
	}
}

export default ScaleServiceFactory

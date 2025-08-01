import { ScaleInterface } from './ScaleInterface'

class MockScaleService extends ScaleInterface {
	constructor() {
		super()
		this.isScanning = false
		this.connectedDevice = null
		this.weightUpdateInterval = null
		this.currentWeight = 0
		this.deviceId = ''
		this.needsTare = false
	}

	startScan(onDeviceFound) {
		if (this.isScanning) return

		this.isScanning = true
		console.log('Mock scale: Starting scan...')

		// Simulate finding a device after 1 second
		setTimeout(() => {
			const mockDevice = {
				id: 'mock-device-1',
				name: 'Mock Scale',
				rssi: -50,
			}
			onDeviceFound(mockDevice)
			this.stopScan()
		}, 1000)
	}

	stopScan() {
		this.isScanning = false
		console.log('Mock scale: Stopping scan...')
	}

	async connect(device, onWeightUpdate) {
		if (this.connectedDevice) {
			throw new Error('Already connected to a device')
		}

		console.log('Mock scale: Connecting to device:', device.id)

		// Simulate connection delay
		await new Promise((resolve) => setTimeout(resolve, 1000))

		this.connectedDevice = {
			id: device.id,
			name: 'Mock Scale',
		}
		this.deviceId = device.id
		// Start sending random weight updates
		this.startWeightUpdates(onWeightUpdate)

		return this.connectedDevice
	}

	startWeightUpdates(onWeightUpdate) {
		// Store the onWeightUpdate callback
		this.onWeightUpdateCallback = onWeightUpdate
		// Immediately send an initial weight update
		this.onWeightUpdateCallback({
			value: this.currentWeight,
			unit: 'g',
			isStable: true,
			isTare: this.needsTare,
		})
	}

	mockWeightChange(delta) {
		this.currentWeight += delta
		// Ensure weight doesn't go below zero
		this.currentWeight = Math.max(0, this.currentWeight)
		if (this.onWeightUpdateCallback) {
			this.onWeightUpdateCallback({
				value: this.currentWeight,
				unit: 'g',
				isStable: false, // Not stable during change
				isTare: false,
			})
		}
	}

	mockStableWeight() {
		if (this.onWeightUpdateCallback) {
			this.onWeightUpdateCallback({
				value: this.currentWeight,
				unit: 'g',
				isStable: true,
				isTare: false,
			})
		}
	}

	mockTare() {
		this.currentWeight = 0
		if (this.onWeightUpdateCallback) {
			this.onWeightUpdateCallback({
				value: this.currentWeight,
				unit: 'g',
				isStable: true,
				isTare: true,
			})
		}
	}

	async disconnect() {
		this.connectedDevice = null
		this.currentWeight = 0
		this.onWeightUpdateCallback = null // Clear the callback
	}

	async readWeight(device) {
		if (!this.connectedDevice || this.connectedDevice.id !== device.id) {
			throw new Error('Not connected to this device')
		}

		// Return the current mock weight
		return this.currentWeight
	}
}

export default new MockScaleService()

import LefuScale from '@modules/lefu-scale'

export const LefuScaleEvents = Object.freeze({
	ON_DEVICE_DISCOVERED: 'onDeviceDiscovered',
	ON_BLE_STATE_CHANGE: 'onBleStateChange',
	ON_WEIGHT_CHANGE: 'onWeightChange',
	ON_ERROR: 'onConnectError',
})

class LefuScaleModule {
	constructor() {
		this.lefuScale = LefuScale
		this.events = Object.fromEntries(
			Object.values(LefuScaleEvents).map((eventName) => [eventName, null])
		)
	}

	async initializeScale(key, secret) {
		return await this.lefuScale.initializeSdk(key, secret)
	}

	async startScan() {
		return this.lefuScale.startScan()
	}

	async stopScan() {
		return this.lefuScale.stopScan()
	}

	async connectToDevice(deviceId) {
		return this.lefuScale.connectToDevice(deviceId)
	}

	async toZeroKitchenScale() {
		return this.lefuScale.toZeroKitchenScale()
	}

	async changeKitchenScaleUnit(unit) {
		return this.lefuScale.changeKitchenScaleUnit(unit)
	}

	async sendSyncTime() {
		return this.lefuScale.sendSyncTime()
	}

	async switchBuzzer(isOn) {
		return this.lefuScale.switchBuzzer(isOn)
	}

	async disconnect() {
		return this.lefuScale.disconnect()
	}

	#addListener(eventName, callback) {
		if (this.events[eventName]) {
			return this.events[eventName]
		}

		console.log("Adding active Event '" + eventName + "'.")
		const subscription = this.lefuScale.addListener(eventName, callback)
		this.events[eventName] = subscription
		return subscription
	}

	addDeviceDiscoveredListener(callback) {
		return this.#addListener(LefuScaleEvents.ON_DEVICE_DISCOVERED, callback)
	}

	addErrorListener(callback) {
		return this.#addListener(LefuScaleEvents.ON_ERROR, callback)
	}

	addBleStateChangeListener(callback) {
		return this.#addListener(LefuScaleEvents.ON_BLE_STATE_CHANGE, callback)
	}

	addWeightListener(callback) {
		return this.#addListener(LefuScaleEvents.ON_WEIGHT_CHANGE, callback)
	}

	/**
	 * Removes LefuScaleModule event listeners.
	 *
	 * @param {string|string[]} eventName - The name(s) of the event listener(s) to remove:
	 *   - If a string, removes the single listener.
	 *   - If an array of strings, removes all listeners in the list.
	 *
	 * @throws {Error} If an event name is not declared in LefuScaleEvents or invalid argument type.
	 */
	removeListener(eventName) {
		const removeOne = (name) => {
			if (!Object.values(LefuScaleEvents).includes(name)) {
				console.warn('Event name "' + name + '" not declared!!')
				return
			}

			if (this.events[name]) {
				this.events[name].remove()
				this.events[name] = null
			}
		}

		if (typeof eventName === 'string') {
			removeOne(eventName)
		} else if (Array.isArray(eventName)) {
			for (const name of eventName) {
				removeOne(name)
			}
		} else {
			throw new Error('Invalid argument: Either string or array of strings.')
		}
	}

	removeAllListener() {
		for (const key of Object.keys(this.events)) {
			if (this.events[key]) {
				this.events[key].remove()
				this.events[key] = null
			}
		}
	}
}

export default new LefuScaleModule()

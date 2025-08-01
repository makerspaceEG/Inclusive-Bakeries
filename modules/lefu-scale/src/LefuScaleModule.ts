import { NativeModule, requireNativeModule } from 'expo'
import { LefuScaleModuleEvents } from './LefuScale.types'

declare class LefuScaleModule extends NativeModule<LefuScaleModuleEvents> {
	initializeSdk(apiKey: string, apiSecret: string): Promise<void>
	startScan(): Promise<void>
	stopScan(): Promise<void>
	connectToDevice(mac: string): Promise<Boolean>
	disconnect(): Promise<Boolean>
	toZeroKitchenScale(): Promise<Boolean>
	changeKitchenScaleUnit(unit: string): Promise<Boolean>
	sendSyncTime(): Promise<Boolean>
	switchBuzzer(isOn: string): Promise<Boolean>
}

export default requireNativeModule<LefuScaleModule>('LefuScale')

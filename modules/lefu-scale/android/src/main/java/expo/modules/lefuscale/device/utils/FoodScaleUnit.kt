package expo.modules.lefuscale.device.utils

import com.lefu.ppbase.vo.PPUnitType; 

enum class FoodScaleUnit(val rawValue: String, val displayName: String) {
    GRAMS("ppunitg", "grams"),
    KILOGRAMS("ppunitkg", "kg"),
    MILLILITERS_WATER("ppunitmlwater", "ml"),
    MILLILITERS_MILK("ppunitmlmilk", "ml milk"),
    OUNCES("ppunitoz", "oz"),
    POUNDS("unit_lb", "lb"),
    OUNCESPOUNDS("ppunitlboz", "lb oz"),
    UNKNOWN("unknown", "unknown");

    companion object {
        fun fromRawValue(value: String?): FoodScaleUnit {
            return values().find { it.rawValue.equals(value, ignoreCase = true) } ?: UNKNOWN
        }

        /**
         * Accepts user-friendly input like "g", "kg", "ml", etc.
         */
        fun fromUserInput(input: String?): FoodScaleUnit {
            return when (input?.lowercase()) {
                "g", "gram", "grams" -> GRAMS
                "kg", "kilogram", "kilograms" -> KILOGRAMS
                "ml" -> MILLILITERS_WATER
                "milk" -> MILLILITERS_MILK
                "oz", "ounces" -> OUNCES
                "lb", "pounds" -> POUNDS
                "lb oz", "pounds ounces", "lboz" -> OUNCESPOUNDS
                else -> UNKNOWN
            }
        }
    }

    /**
     * Converts this FoodScaleUnit to PPUnitType used by the SDK.
     */
    fun toPPUnitType(): PPUnitType? {
        return when (this) {
            GRAMS -> PPUnitType.PPUnitG
            KILOGRAMS -> PPUnitType.Unit_KG
            MILLILITERS_WATER -> PPUnitType.PPUnitMLWater
            MILLILITERS_MILK -> PPUnitType.PPUnitMLMilk
            OUNCES -> PPUnitType.PPUnitOZ
            POUNDS -> PPUnitType.Unit_LB
            OUNCESPOUNDS -> PPUnitType.PPUnitLBOZ
            UNKNOWN -> null
        }
    }
}
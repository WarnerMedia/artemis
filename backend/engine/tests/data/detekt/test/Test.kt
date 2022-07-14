class Test {
    init {
        try {
            1 / 0
        } catch (e: ArithmeticException) {
            e.printStackTrace()
        }
    }
}

/**
 * MrNomNom gameplay rounds.
 */
export default [
    // Round 0 defines defaults
    {
        // Number of figures
        numFigures: 5,
        // Start distance of figures to center
        radius: { min: 15, max: 35 },
        // Height of players's viewpoint
        cameraHeight: 20,
        // Approach speed of figures
        speed: 2.75,
        // General factor that decreases stopChance and increases walkChance
        aggro: 1,
        // Coins spawned at the beginning of round
        coins: 8,
        // Coins spawned per enemy captured
        coinsPerCapture: 4,
        // Time the player is invincible at beginning of round
        invincibility: 4,
        // Time the enemies disperse at the beginning of round, before attacking player
        disperseTime: 5,
        // Radius of coin drop when enemey is captured
        coinsDropRadius: { min: 5, max: 10 }
    },
    
    // Round 1
    {
        numFigures: 1,
        speed: 2,
        coins: 12,
        coinsPerCapture: 0,
        cameraHeight: 10
    },
    // Round 2
    {
        numFigures: 2,
        speed: 4,
        coins: 8,
        coinsPerCapture: 4,
        cameraHeight: 12
        
    },
    // Round 3
    {
        numFigures: 3,
        speed: 6,
        coins: 8,
        coinsPerCapture: 3,
        cameraHeight: 14
    },
    // Round 4
    {
        numFigures: 4,
        speed: 8,
        coins: 10,
        coinsPerCapture: 3,
        cameraHeight: 16
    },
    // Round 5
    {
        numFigures: 5,
        speed: 10,
        coins: 10,
        coinsPerCapture: 2,
        cameraHeight: 18
    },
    // Round 6
    {
        numFigures: 6,
        speed: 12,
        coins: 4,
        coinsPerCapture: 8
    },
    // Round 7
    {
        numFigures: 7,
        speed: 16,
        coins: 12,
        coinsPerCapture: 3
    },
    // Round 8
    {
        numFigures: 8,
        speed: 20,
        coins: 15,
        coinsPerCapture: 2
    },
    // Round 9
    {
        numFigures: 9,
        speed: 24,
        coins: 18,
        coinsPerCapture: 2
    },
    // Round 10
    {
        numFigures: 10,
        speed: 32,
        coins: 18,
        coinsPerCapture: 1
    }
];
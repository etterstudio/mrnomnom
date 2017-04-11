/**
 * MrNomNom sound configuration.
 */
export default {
  // Default values used if not overridden in individual sound definitions
  default: {
    // --- General Options:
    // Default gain volume
    volume: 1,
    // Playback mode: 'random', 'sequential', 'ascending'
    playback: 'random',
    // Wether sound is played 3D or 2D
    spatiality: '3D',
    // Fade in sound over given seconds
    fadeIn: 0,
    // Fade out sound over given seconds
    fadeOut: 0,

    // --- Positional Options:
    // Panning Model: 'equalpower' or 'HRTF'
    panningModel: 'equalpower',
    // Distance Model: 'linear', 'inverse' or 'exponential'
    // See https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/distanceModel
    distanceModel: 'linear',
    // Reference distance used in distance model
    refDistance: 3,
    // Max distance used in distance model
    maxDistance: 35,
    // Rolloff factor used in distance model
    rolloffFactor: 1
  },

  // Title melody
  title_melody: {
    files: 'audio/boombox',
    volume: 1,
    spatiality: '2D',
    fadeIn: 2,
    fadeOut: 2
  },

  // Looping athmo sound
  athmo: {
    files: 'audio/ambientNew1',
    spatiality: '2D',
    volume: 0.5
  },

  // Countdown sound played every second
  countdown: {
    files: [
      '#analog_down2'
    ],
    playback: 'sequential',
    spatiality: '2D',
    volume: 1
  },

  // Step sounds approaching
  step: {
    files: {
      fig1: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig2: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig3: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig4: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig5: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig6: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig7: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig8: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig9: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig10: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig11: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig13: [
        '#fig10_step1',
        '#fig10_step2'
      ],
      fig14: [
        '#fig10_step1',
        '#fig10_step2'
      ]
    },
    playback: 'sequential',
    volume: 0.1
  },

  // Sit down
  sit_down: {
    files: {
      fig1: [
        '#analog_down1'
      ],
      fig2: [
        '#analog_down2'
      ],
      fig3: [
        '#analog_down3'
      ],
      fig4: [
        '#analog_down4'
      ],
      fig5: [
        '#analog_down5'
      ],
      fig6: [
        '#fig6_sit'
      ],
      fig7: [
        '#fig7_sit'
      ],
      fig8: [
        '#fig8_sit'
      ],
      fig9: [
        '#analog_down6'
      ],
      fig10: [
        '#fig10_sit'
      ],
      fig11: [
        '#fig11_sit'
      ],
      fig13: [
        '#fig13_sit'
      ],
      fig14: [
        '#fig12_sit'
      ]
    },
    volume: 0.75
  },

  // Stand up
  stand_up: {
    files: {
      fig1: [
        '#analog_up1'
      ],
      fig2: [
        '#analog_up2'
      ],
      fig3: [
        '#analog_up3'
      ],
      fig4: [
        '#analog_up4'
      ],
      fig5: [
        '#analog_up5'
      ],
      fig6: [
        '#fig6_up'
      ],
      fig7: [
        '#fig7_up'
      ],
      fig8: [
        '#fig8_up'
      ],
      fig9: [
        '#analog_up6'
      ],
      fig10: [
        '#fig10_up'
      ],
      fig11: [
        '#fig11_up'
      ],
      fig13: [
        '#fig13_up'
      ],
      fig14: [
        '#fig12_up'
      ]
    },
    volume: 0.75
  },

  // Buzzing loop of bee (all on 50%)
  bee_buzz: {
    files: '#buzz',
    volume: 0.025,
    velocityVolume: 0.05,
    velocityPitch: 0.5
  },
  
  nomnom_scream: {
    files: [
      '#nomnom_scream_2'
    ],
    volume: 1
  },
  
  // New round is being announced
  round_announce: {
    files: '#levelSound_3',
    volume: 0.85,
    spatiality: '2D'
  },

  // New round has started
  round_start: {
    files: '#roundStart',
    volume: 1,
    spatiality: '2D'
  },
  
  // Round was completed successfully
  round_over: {
    files: '#roundWon_sh1',
    volume: 1,
    spatiality: '2D'
  },
  
  // Played when ribbon extension is picked up
  ribbon_grow: {
    files: [
      '#ribbon_1',
      '#ribbon_2',
      '#ribbon_3',
      '#ribbon_4',
      '#ribbon_5',
      '#ribbon_6',
      '#ribbon_7',
      '#ribbon_8',
      '#ribbon_9',
      '#ribbon_10',
      '#ribbon_11',
      '#ribbon_12'
    ],
    playback: 'ascending',
    volume: 1,
    spatiality: '2D'
  },
  
  // An enemy was captured with the ribbon
  ribbon_capture: {
    files: [
      '#roundStart'
    ],
    volume: 1,
    spatiality: '2D'
  },
  
  // Donut got eaten
  game_over: {
    files: [
      '#gameOver_1',
      '#gameOver_2',
      '#gameOver_3',
      '#gameOver_4',
      '#gameOver_5',
      '#gameOver_6',
      '#gameOver_7',
      '#gameOver_8'
    ],
    volume: 1,
    spatiality: '2D'
  },
  
  // Played when all rounds have been completed successfully
  game_won: {
    files: '#roundWon_sh1',
    volume: 1,
    spatiality: '2D'
  }
};
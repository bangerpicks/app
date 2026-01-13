/**
 * Display Name Suggestions
 * 
 * A collection of creative, username-style display name suggestions
 * for users to choose from during sign-up.
 */

export const DISPLAY_NAME_SUGGESTIONS = [
  // Football/Soccer themed
  'footyluvr',
  'footyfan',
  'footyking',
  'footyqueen',
  'footypro',
  'footymaster',
  'soccerstar',
  'soccerboss',
  'soccerking',
  'footballfan',
  'footballpro',
  'footballgod',
  'footballgoat',
  'thegoat',
  'goatpredictor',
  'footyguru',
  'soccerguru',
  'footywizard',
  'soccerwizard',
  
  // Banger Picks themed
  'bangerking',
  'bangerqueen',
  'bangerboss',
  'bangerpro',
  'bangerstar',
  'bangerlegend',
  'bangerchamp',
  'bangerking',
  'bangerkingpin',
  'bangerlord',
  'bangerballer',
  'bangerbeast',
  'bangermaster',
  'bangervip',
  
  // Prediction themed
  'predictorpro',
  'predictorpro',
  'predictionking',
  'predictionqueen',
  'predictionboss',
  'predictormaster',
  'predictorlegend',
  'predictorstar',
  'predictorgoat',
  'predictorguru',
  'predictorwizard',
  'predictorchamp',
  'predictorbeast',
  'predictionpro',
  'predictionguru',
  
  // Betting/Pick themed
  'pickmaster',
  'pickking',
  'pickqueen',
  'pickpro',
  'pickstar',
  'picklegend',
  'pickchamp',
  'pickboss',
  'pickguru',
  'pickwizard',
  'pickbeast',
  'bestpicks',
  'pickspro',
  'pickemking',
  'pickemqueen',
  
  // Winner/Champion themed
  'winner',
  'winning',
  'thewinner',
  'alwayswin',
  'champion',
  'champ',
  'thechamp',
  'championpro',
  'champking',
  'champqueen',
  'champboss',
  'champlord',
  'champmaster',
  
  // Legend/Elite themed
  'legend',
  'thelegend',
  'legendary',
  'elite',
  'theelite',
  'elitepro',
  'eliteking',
  'elitequeen',
  'eliteboss',
  'elitemaster',
  'legendpro',
  'legendking',
  'legendqueen',
  
  // Pro/Master themed
  'pro',
  'thepro',
  'master',
  'themaster',
  'masterpro',
  'proking',
  'proqueen',
  'proboss',
  'prostar',
  'prolegend',
  'masterking',
  'masterqueen',
  'masterboss',
  
  // Star/Beast themed
  'star',
  'thestar',
  'starpro',
  'starking',
  'starqueen',
  'starboss',
  'beast',
  'thebeast',
  'beastpro',
  'beastking',
  'beastqueen',
  'beastboss',
  'beastmode',
  
  // King/Queen/Lord themed
  'king',
  'theking',
  'kingpro',
  'kingpin',
  'queen',
  'thequeen',
  'queenpro',
  'lord',
  'thelord',
  'lordpro',
  'boss',
  'theboss',
  'bosspro',
  
  // Football + Action combos
  'footybeast',
  'footystar',
  'footychamp',
  'footywinner',
  'footylegend',
  'soccerbeast',
  'soccerchamp',
  'soccerwinner',
  'soccerlegend',
  'footballbeast',
  'footballchamp',
  'footballwinner',
  'footballlegend',
  
  // Prediction + Action combos
  'predictionchamp',
  'predictionwinner',
  'predictionbeast',
  'predictionstar',
  'predictorwinner',
  'predictorchamp',
  'predictorbeast',
  'predictorstar',
  
  // Pick + Action combos
  'pickwinner',
  'pickchampion',
  'pickbeast',
  'pickstar',
  'picklegend',
  
  // Number/Year variants
  'footy2024',
  'footy2025',
  'banger2024',
  'banger2025',
  'predictor2024',
  'predictor2025',
  
  // Creative combinations
  'footypickking',
  'soccerpickpro',
  'footballpredictor',
  'bangerfootball',
  'footybanger',
  'predictionking',
  'pickmaster',
  'winningpicks',
  'championpicks',
  'legendpicks',
  'elitepicks',
]

/**
 * Get a random subset of suggestions
 * @param count Number of suggestions to return (default: 4)
 * @returns Array of display name suggestions
 */
export function getRandomSuggestions(count: number = 4): string[] {
  const shuffled = [...DISPLAY_NAME_SUGGESTIONS].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, DISPLAY_NAME_SUGGESTIONS.length))
}

/**
 * Get suggestions by category
 * @param category Category filter (optional)
 * @returns Array of display name suggestions
 */
export function getSuggestionsByCategory(category?: string): string[] {
  if (!category) return DISPLAY_NAME_SUGGESTIONS
  
  const lowerCategory = category.toLowerCase()
  return DISPLAY_NAME_SUGGESTIONS.filter(name => 
    name.toLowerCase().includes(lowerCategory)
  )
}

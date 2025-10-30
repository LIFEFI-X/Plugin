// 语言包类型定义
export interface Locale {
  common: {
    save: string
    cancel: string
    delete: string
    edit: string
    create: string
    confirm: string
    loading: string
    success: string
    error: string
    close: string
  }
  
  knowledge: {
    title: string
    create: string
    create_nft: string
    select_for_nft: string
    max_selected: string
    enabled_count: string
    empty_state: string
    empty_hint: string
    name_label: string
    name_placeholder: string
    content_label: string
    content_placeholder: string
    max_enabled: string
    delete_confirm: string
    estimated: string
  }
  
  nft: {
    creating_transfer: string
    transfer_created: string
    opening_page: string
    select_kb_hint: string
    select_mode: string
    create_button: string
    min_selection: string
    max_selection: string
    transfer_failed: string
  }
  
  game: {
    center: string
    title: string
    description: string
    start: string
    restart: string
    pause: string
    resume: string
    gameOver: string
    score: string
    highScore: string
    combo: string
    accuracy: string
    avgSpeed: string
    maxCombo: string
    duration: string
    points: string
    rank: string
    stats: string
    records: string
    totalGames: string
    totalPoints: string
    bestAccuracy: string
    totalPlayTime: string
    averageScore: string
    viewStats: string
    clearData: string
    clearConfirm: string
    noRecords: string
    playHint: string
    comingSoon: string
  }
  
  crossTab: {
    title: string
    collect: string
    collected: string
    clear_all: string
    empty_state: string
    empty_hint: string
    from: string
  }
  
  tips: {
    title: string
    completion: string
    toolbar: string
    knowledge: string
    crossTab?: string
    cross_tab: string
  }
  
  ai: {
    completion_prompt: string
    polish_prompt: string
    correct_prompt: string
    simplify_prompt: string
    expand_prompt: string
  }
  
  messages: {
    kb_saved: string
    kb_deleted: string
    context_added: string
    max_kb_enabled: string
    nft_data_prepared: string
    fill_required: string
  }
  
  assistant: {
    needHelp: string
    aiProcessing: string
    aiGenerating: string
    processComplete: string
    processFailed: string
    polishText: string
    correctGrammar: string
    simplifyText: string
    expandText: string
    customPrompt: string
    addContext: string
    translateText: string
    unknownError: string
  }

  contextMenu: {
    addToContext: string
    translate: string
    chatWithLifeFi: string
  }
  
  pet: {
    name: string
    greeting: string
    dragHint: string
    contextAdded: string
    contextAddedWithCount: string
    noInput: string
    eating: string
    bathing: string
    bathExit: string
    selectCharacter: string
    chat: {
      title: string
      knowledgeBase: string
      context: string
      inputPlaceholder: string
      send: string
      sending: string
    }
    keyboard: {
      move: string
      jump: string
      eat: string
    }
    modes: {
      normal: string
      eating: string
      bathing: string
    }
    characters: {
      diana: string
      ava: string
      bella: string
      carol: string
      eileen: string
      faye: string
    }
    ai: {
      translating: string
      translateComplete: string
      thinking: string
      chatComplete: string
      error: string
      noConfig: string
      noProvider: string
      noModel: string
      noResponse: string
    }
    nft: {
      bindWallet: string
      equipPet: string
      walletHint: string
      walletPlaceholder: string
      bind: string
      unbind: string
      walletAddress: string
      equipped: string
      equip: string
      nftPet: string
      moreCompanion: string
    }
    gpt: {
      selectPet: string
      currentRate: string
      unlock: string
      active: string
      locked: string
      tier: string
      gptPets: string
    }
    messages: {
      diana: string[]
      ava: string[]
      bella: string[]
      carol: string[]
      eileen: string[]
      faye: string[]
    }
  }
}


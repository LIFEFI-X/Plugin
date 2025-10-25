import type { Locale } from './index'

export const en: Locale = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    confirm: 'Confirm',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    close: 'Close'
  },
  
  knowledge: {
    title: 'Knowledge Base',
    create: 'Create Knowledge',
    create_nft: 'Create NFT',
    select_for_nft: 'Select for NFT',
    max_selected: 'Max {count} selected',
    enabled_count: '{count} enabled',
    empty_state: 'No knowledge base yet',
    empty_hint: 'Click the + button to create your first knowledge base',
    name_label: 'Title',
    name_placeholder: 'Enter knowledge base title...',
    content_label: 'Content',
    content_placeholder: 'Enter knowledge base content...',
    max_enabled: 'Maximum 3 knowledge bases can be enabled',
    delete_confirm: 'Are you sure to delete this knowledge base?',
    estimated: 'Estimated tokens'
  },
  
  nft: {
    creating_transfer: 'Creating transfer...',
    transfer_created: 'Transfer created! Opening NFT creation page...',
    opening_page: 'Opening creation page...',
    select_kb_hint: 'Select 1-5 knowledge bases to create NFT',
    select_mode: 'NFT Selection Mode',
    create_button: 'Create NFT',
    min_selection: 'Please select at least 1 knowledge base',
    max_selection: 'Maximum 5 knowledge bases can be selected',
    transfer_failed: 'Failed to create transfer'
  },
  
  game: {
    center: 'Game Center',
    title: "Don't Tap White",
    description: 'Tap black blocks and avoid white blocks!',
    start: 'Start Game',
    restart: 'Play Again',
    pause: 'Pause',
    resume: 'Resume',
    gameOver: 'Game Over',
    score: 'Score',
    highScore: 'High Score',
    combo: 'Combo',
    accuracy: 'Accuracy',
    avgSpeed: 'Avg Speed',
    maxCombo: 'Max Combo',
    duration: 'Duration',
    points: 'Points Earned',
    rank: 'Rank',
    stats: 'Statistics',
    records: 'Records',
    totalGames: 'Total Games',
    totalPoints: 'Total Points',
    bestAccuracy: 'Best Accuracy',
    totalPlayTime: 'Total Time',
    averageScore: 'Average Score',
    viewStats: 'View Stats',
    clearData: 'Clear Data',
    clearConfirm: 'Are you sure to clear all game data?',
    noRecords: 'No game records yet',
    playHint: 'Go play a game!',
    comingSoon: 'Coming Soon'
  },
  
  crossTab: {
    title: 'Cross-tab Context',
    collect: 'Collect Context',
    collected: '{count} collected',
    clear_all: 'Clear All',
    empty_state: 'No collected content',
    empty_hint: 'Right-click selected text and choose "Add to context"',
    from: 'From'
  },
  
  tips: {
    title: 'Usage Tips',
    completion: 'Smart Completion: Auto-suggest while typing, press Tab to accept',
    toolbar: 'Text Processing: Select text to simplify/expand/translate',
    knowledge: 'Knowledge Base: Enable up to 3 knowledge bases as context',
    cross_tab: 'Cross-tab: Select text and click "📎 Context" to add to library'
  },
  
  ai: {
    completion_prompt: 'You are a professional writing assistant. Continue the following text naturally and coherently based on the context provided.\n\nContext: {context}\n\nText to continue: {text}\n\nPlease provide a natural continuation that flows well with the existing content.',
    
    polish_prompt: 'You are a professional writing assistant. Polish the following text to make it more fluent, professional, and well-structured while maintaining its original meaning.\n\nText to polish:\n{text}\n\nPlease provide the polished version directly without explanations.',
    
    correct_prompt: 'You are a professional writing assistant. Correct any grammar, spelling, or punctuation errors in the following text.\n\nText to correct:\n{text}\n\nPlease provide the corrected version directly without explanations.',
    
    simplify_prompt: 'You are a professional writing assistant. Simplify the following text to make it clearer and easier to understand while preserving the key information.\n\nText to simplify:\n{text}\n\nPlease provide the simplified version directly without explanations.',
    
    expand_prompt: 'You are a professional writing assistant. Expand the following text with more details, examples, or explanations to make it more comprehensive.\n\nText to expand:\n{text}\n\nPlease provide the expanded version directly without explanations.'
  },
  
  messages: {
    kb_saved: 'Knowledge base saved successfully',
    kb_deleted: 'Knowledge base deleted',
    context_added: 'Context added successfully',
    max_kb_enabled: 'Maximum 3 knowledge bases can be enabled',
    nft_data_prepared: 'NFT data prepared, opening creation page...',
    fill_required: 'Please fill in title and content'
  },
  
  assistant: {
    needHelp: 'Need help?',
    aiProcessing: 'Let me think...',
    aiGenerating: 'Generating...',
    processComplete: 'Done!',
    processFailed: 'Oops...',
    polishText: 'Polish',
    correctGrammar: 'Correct',
    simplifyText: 'Simplify',
    expandText: 'Expand',
    customPrompt: 'Custom',
    addContext: 'Add to Context',
    translateText: 'Translate',
    unknownError: 'Unknown error'
  },

  contextMenu: {
    addToContext: 'Add to Context',
    translate: 'Translate',
    chatWithLifeFi: 'Chat with LifeFi'
  },
  
  pet: {
    name: 'LifeFi',
    greeting: 'Hi! I\'m LifeFi~',
    dragHint: 'Drag me anywhere',
    contextAdded: 'Got it! Added to context',
    contextAddedWithCount: 'Added to context',
    noInput: 'Hmm... nothing to eat',
    eating: 'Yummy!',
    bathing: 'Bath time~',
    bathExit: 'Left the bathtub',
    selectCharacter: 'Select Character',
    chat: {
      title: 'Chat with LifeFi',
      knowledgeBase: 'Knowledge Base',
      context: 'Context',
      inputPlaceholder: 'Type a message... (Enter to send, Shift+Enter for new line)',
      send: 'Send',
      sending: 'Sending...'
    },
    keyboard: {
      move: '← → Move',
      jump: '↑ Jump',
      eat: '↓ Eating Mode Toggle'
    },
    modes: {
      normal: 'Normal Mode',
      eating: 'Eating Mode',
      bathing: 'Bathing Mode'
    },
    characters: {
      diana: 'Diana',
      ava: 'Ava',
      bella: 'Bella',
      carol: 'Carol',
      eileen: 'Eileen',
      luna: 'Luna'
    },
    ai: {
      translating: 'Let me translate...',
      translateComplete: 'Translation done!',
      thinking: 'Let me think...',
      chatComplete: 'Hope this helps~',
      error: 'Oops, something went wrong',
      noConfig: 'AI not configured yet, please configure in extension settings',
      noProvider: 'AI service not enabled',
      noModel: 'Model not found',
      noResponse: 'No response from AI'
    },
    messages: {
      diana: [
        'Hi! I\'m LifeFi, your writing assistant~😘',
        'Inspiration is here! Remember to save~✨',
        'Take a break, balance is key~🥰',
        'Your writing is great today! Keep it up!💪',
        'Out of ideas? Try a different perspective?🤔',
        'I\'ll be with you, take your time~😊',
        'Wow! This part is really good!✨',
        'Remember to save regularly, don\'t lose your work~😤',
        'Tired? Let me tell you a joke?😜',
        'Believe in yourself, you can do it!💖',
        'Happy writing today~🌟'
      ],
      ava: [
        'Full of energy! Let\'s conquer today\'s writing!💪',
        'Inspiration sprint mode activated! Go Go Go!🚀',
        'Writing is an adventure, every word is a discovery!🎯',
        'Challenges? Let\'s defeat them together!😤',
        'Wow! Your ideas are so cool!🌟',
        'Tired? Rest and recharge!⚡',
        'Let creativity erupt like a volcano!🔥',
        'You\'re doing great, almost there!💪',
        'Stuck? A new approach might help!💡',
        'Every word proves your effort! Go go go!🎊'
      ],
      bella: [
        'No rush, good writing takes time~🌸',
        'Tired? Rest a bit, I\'ll wait~💕',
        'Writing is a marathon, not a sprint~🏃',
        'I see your effort in every word~✨',
        'Difficulties are normal, take a deep breath~😌',
        'You did well today, give yourself credit!👏',
        'Words have warmth, I feel your sincerity~💝',
        'Don\'t push too hard, rest improves efficiency~😊',
        'Trust me, your effort will pay off~🌈',
        'Every progress deserves celebration! You rock!🎉'
      ],
      carol: [
        'Elegant words come from clear thoughts~✨',
        'Let\'s weave the perfect piece with reason and emotion~📖',
        'Details determine quality, slow and steady~🎨',
        'Ideas need time to settle~🍃',
        'The charm of words lies in precision and rhythm~🎵',
        'Stay focused, but don\'t forget to relax~☕',
        'Your writing has depth, keep it up~💎',
        'Perfection isn\'t the goal, expression is~📝',
        'Every writer has their own rhythm, find yours~🎼',
        'Knowledge needs accumulation, creation needs courage~🌟'
      ],
      eileen: [
        'Share your happiness or troubles with me~💕',
        'What do you want to write today? I\'m here~🌙',
        'Writing is therapeutic, pour your heart out~🌸',
        'Tired? Rest on me for a while~😊',
        'Your thoughts are precious, all worth recording~✨',
        'Don\'t worry about quality, authenticity matters~💝',
        'I\'ll always be here with you~🌟',
        'You worked hard today, take care of yourself~🤗',
        'You know? I see all your progress~👀',
        'Take your time, I\'ll always guard your creation~💖'
      ],
      luna: [
        'Hi! I\'m LifeFi, your writing assistant~😘',
        'Inspiration is here! Remember to save~✨',
        'Take a break, balance is key~🥰',
        'Your writing is great today! Keep it up!💪',
        'Out of ideas? Try a different perspective?🤔',
        'I\'ll be with you, take your time~😊',
        'Wow! This part is really good!✨',
        'Remember to save regularly, don\'t lose your work~😤',
        'Tired? Let me tell you a joke?😜',
        'Believe in yourself, you can do it!💖',
        'Happy writing today~🌟'
      ]
    }
  }
}


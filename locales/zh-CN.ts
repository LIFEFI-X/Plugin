import type { Locale } from './index'

export const zhCN: Locale = {
  common: {
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    confirm: '确认',
    loading: '加载中...',
    success: '成功',
    error: '错误',
    close: '关闭'
  },
  
  knowledge: {
    title: '知识库',
    create: '新建知识库',
    create_nft: '创建 NFT',
    select_for_nft: '选择创建 NFT',
    max_selected: '最多选择 {count} 个',
    enabled_count: '已启用 {count} 个',
    empty_state: '还没有知识库',
    empty_hint: '点击右上角 ＋ 号创建第一个知识库',
    name_label: '标题',
    name_placeholder: '请输入知识库标题...',
    content_label: '内容',
    content_placeholder: '请输入知识库内容...',
    max_enabled: '最多只能同时启用 3 个知识库',
    delete_confirm: '确定要删除这个知识库吗？',
    estimated: '预估 token'
  },
  
  nft: {
    creating_transfer: '正在创建传输...',
    transfer_created: '传输已创建！正在打开 NFT 创建页面...',
    opening_page: '正在打开创建页面...',
    select_kb_hint: '选择 1-5 个知识库创建 NFT',
    select_mode: 'NFT 选择模式',
    create_button: '创建 NFT',
    min_selection: '请至少选择 1 个知识库',
    max_selection: '最多可以选择 5 个知识库',
    transfer_failed: '创建传输失败'
  },
  
  game: {
    center: '游戏中心',
    title: '别踩白块',
    description: '点击黑色方块，避开白色方块！',
    start: '开始游戏',
    restart: '再来一局',
    pause: '暂停',
    resume: '继续',
    gameOver: '游戏结束',
    score: '得分',
    highScore: '最高分',
    combo: '连击',
    accuracy: '准确率',
    avgSpeed: '平均速度',
    maxCombo: '最大连击',
    duration: '游戏时长',
    points: '获得积分',
    rank: '评级',
    stats: '统计',
    records: '记录',
    totalGames: '总游戏',
    totalPoints: '总积分',
    bestAccuracy: '最佳准确率',
    totalPlayTime: '总时长',
    averageScore: '平均分',
    viewStats: '查看统计',
    clearData: '清空数据',
    clearConfirm: '确定要清空所有游戏数据吗？',
    noRecords: '还没有游戏记录',
    playHint: '快去玩一局吧！',
    comingSoon: '敬请期待'
  },
  
  crossTab: {
    title: '跨页签收集',
    collect: '收集上下文',
    collected: '已收集 {count} 条',
    clear_all: '清空',
    empty_state: '还没有收集内容',
    empty_hint: '在任意页面选中文字后右键菜单选择"添加到上下文"',
    from: '来自'
  },
  
  tips: {
    title: '使用提示',
    completion: '智能补全：在任意输入框输入时自动提示，按 Tab 接受',
    toolbar: '文本处理：选中文字后使用浮动工具条进行简化/扩写/翻译',
    knowledge: '知识库：最多同时启用 3 个知识库作为上下文',
    cross_tab: '跨页签：选中文字后点击"📎 上下文"按钮添加到知识库'
  },
  
  ai: {
    completion_prompt: '你是一个专业的写作助手。基于提供的上下文，自然流畅地续写以下文本。\n\n上下文：{context}\n\n待续写文本：{text}\n\n请提供自然流畅的续写内容，与现有内容风格保持一致。',
    
    polish_prompt: '你是一个专业的写作助手。请润色以下文本，使其更加流畅、专业和结构清晰，同时保持原意。\n\n待润色文本：\n{text}\n\n请直接提供润色后的版本，不要添加说明。',
    
    correct_prompt: '你是一个专业的写作助手。请纠正以下文本中的语法、拼写或标点错误。\n\n待纠错文本：\n{text}\n\n请直接提供纠正后的版本，不要添加说明。',
    
    simplify_prompt: '你是一个专业的写作助手。请简化以下文本，使其更清晰易懂，同时保留关键信息。\n\n待简化文本：\n{text}\n\n请直接提供简化后的版本，不要添加说明。',
    
    expand_prompt: '你是一个专业的写作助手。请扩写以下文本，添加更多细节、例子或解释，使其更加全面。\n\n待扩写文本：\n{text}\n\n请直接提供扩写后的版本，不要添加说明。'
  },
  
  messages: {
    kb_saved: '知识库保存成功',
    kb_deleted: '知识库已删除',
    context_added: '上下文添加成功',
    max_kb_enabled: '最多只能同时启用 3 个知识库',
    nft_data_prepared: 'NFT 数据已准备，正在打开创建页面...',
    fill_required: '请填写标题和内容'
  },
  
  assistant: {
    needHelp: '需要我帮忙吗？',
    aiProcessing: '让我想想...',
    aiGenerating: '正在生成...',
    processComplete: '完成了！',
    processFailed: '出错了...',
    polishText: '润色',
    correctGrammar: '纠错',
    simplifyText: '简化',
    expandText: '扩写',
    customPrompt: '自定义',
    addContext: '添加到上下文',
    translateText: '翻译',
    unknownError: '未知错误'
  },

  contextMenu: {
    addToContext: '添加到上下文',
    translate: '翻译',
    chatWithLifeFi: '与 LifeFi 对话'
  },
  
  pet: {
    name: 'LifeFi',
    greeting: '你好！我是 LifeFi~',
    dragHint: '拖动我到任意位置',
    contextAdded: '收到！已添加到上下文',
    contextAddedWithCount: '已添加到上下文',
    noInput: '嗯...没什么可吃的呢',
    eating: '真好吃！',
    bathing: '洗澡时间到啦~',
    bathExit: '走出浴缸了',
    selectCharacter: '选择角色',
    chat: {
      title: '与 LifeFi 对话',
      knowledgeBase: '知识库',
      context: '上下文',
      inputPlaceholder: '输入消息... (Enter 发送, Shift+Enter 换行)',
      send: '发送',
      sending: '发送中...'
    },
    keyboard: {
      move: '← → 移动',
      jump: '↑ 跳跃',
      eat: '↓ 吃字模式开关'
    },
    modes: {
      normal: '普通模式',
      eating: '吃字模式',
      bathing: '洗澡模式'
    },
    characters: {
      diana: 'diana',
      ava: 'ava',
      bella: 'bella',
      carol: 'carol',
      eileen: 'eileen',
      faye: 'faye'
    },
    ai: {
      translating: '让我翻译一下...',
      translateComplete: '翻译完成！',
      thinking: '让我想想...',
      chatComplete: '希望这能帮到你~',
      error: '哎呀，出错了',
      noConfig: '还没配置 AI 呢，请先在插件设置中配置',
      noProvider: 'AI 服务未启用',
      noModel: '未找到对应的模型',
      noResponse: 'AI 没有返回响应'
    },
    nft: {
      bindWallet: '绑定钱包',
      equipPet: '装备伙伴',
      walletHint: '绑定您的钱包地址以解锁您的 LifeFi 伙伴',
      walletPlaceholder: '输入您的钱包地址 (SOL)',
      bind: '绑定',
      unbind: '解绑钱包',
      walletAddress: '钱包',
      equipped: '已装备',
      equip: '装备',
      nftPet: 'NFT 伙伴',
      moreCompanion: '更多伙伴'
    },
    gpt: {
      selectPet: '选择 LifeFi 伙伴',
      currentRate: '当前积分倍率',
      unlock: '解锁',
      active: '已激活',
      locked: '已锁定',
      tier: '等级',
      gptPets: '积分解锁伙伴'
    },
    messages: {
      diana: [
        '嗨！我是 LifeFi，你的专属写作小助手~😘',
        '写作灵感来啦！记得随时保存哦~✨',
        '休息一下吧，劳逸结合才能写得更好~🥰',
        '你今天的文字很棒呢！继续加油！💪',
        '灵感枯竭了吗？要不要试试换个角度思考？🤔',
        '我会一直陪着你的，慢慢来，不着急~😊',
        '哇！这段写得真不错！✨',
        '要记得定时保存文档哦，我可不想你的心血白费~😤',
        '写累了就休息会儿，我给你讲个笑话好不好？😜',
        '相信自己，你一定能写出精彩的内容！💖',
        '今天也要开开心心地写作哦~🌟'
      ],
      ava: [
        '元气满满！让我们一起征服今天的写作任务吧！💪',
        '灵感冲刺模式启动！Go Go Go！🚀',
        '写作就像冒险，每个字都是新的发现！🎯',
        '困难什么的，我们一起打败它！😤',
        '哇哦！你的想法真是太酷了！🌟',
        '累了就休息，充满能量再出发！⚡',
        '让创意像火山一样爆发吧！🔥',
        '你已经很棒了，再加把劲就完成啦！💪',
        '遇到瓶颈了？换个思路说不定豁然开朗哦！💡',
        '每个字都是你努力的证明！加油加油！🎊'
      ],
      bella: [
        '别着急，慢慢来，好文章需要时间打磨~🌸',
        '累了的话，先休息一下吧，我会等你的~💕',
        '写作是一场马拉松，不是百米冲刺哦~🏃',
        '你的每一个字我都看在眼里，真的很用心呢~✨',
        '遇到困难很正常，深呼吸，我们慢慢解决~😌',
        '今天已经做得很好啦，给自己一个鼓励吧！👏',
        '文字是有温度的，你的真诚我能感受到~💝',
        '不要太勉强自己，适当休息效率更高哦~😊',
        '相信我，你的努力一定会有回报的~🌈',
        '每一次进步都值得庆祝！你真棒！🎉'
      ],
      carol: [
        '优雅的文字源于清晰的思路~✨',
        '让我们用理性与感性编织完美的篇章~📖',
        '细节决定品质，慢工出细活~🎨',
        '灵感需要沉淀，不妨先整理一下思绪~🍃',
        '文字的魅力在于精准与韵律的平衡~🎵',
        '保持专注，但也别忘了适时放松~☕',
        '你的文字很有深度，继续保持~💎',
        '完美不是目标，表达才是核心~📝',
        '每个作者都有自己的节奏，找到你的~🎼',
        '知识需要积累，创作需要勇气~🌟'
      ],
      eileen: [
        '无论开心还是烦恼，都可以写下来告诉我哦~💕',
        '你今天想写点什么呢？我陪你一起~🌙',
        '写作也是一种治愈，把心情都倾诉出来吧~🌸',
        '累了就靠在我这里休息一会儿~😊',
        '你的想法很珍贵，每一个都值得被记录~✨',
        '不用担心写得好不好，真实最重要~💝',
        '我会一直在这里，陪你度过每个写作时光~🌟',
        '今天也辛苦啦，要好好照顾自己哦~🤗',
        '你知道吗？你的进步我都看得见~👀',
        '慢慢来，我会一直守护着你的创作~💖'
      ],
      faye: [
        '写作是一种表达，也是一种思考~💭',
        '灵感来了，就赶紧写下来吧~✨',
        '写作是一种享受，也是一种挑战~🎯',
        '写作是一种成长，也是一种收获~🌟',
        '写作是一种表达，也是一种思考~💭',
        '灵感来了，就赶紧写下来吧~✨'
      ]
    }
  }
}


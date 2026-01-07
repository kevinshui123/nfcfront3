const translations = {
  zh: {
    brandTitle: 'Songzike Tool',
    brandSubtitle: '商家管理后台',
    brandTitleUpper: 'SONGZIKE TOOL',
    welcome: 'Welcome',
    nfcPrompt: '输入或使用 AI 生成文案',
    uploadPhoto: '上传照片',
    aiGenerate: 'AI 生成评价',
    login: '登录',
    emailPlaceholder: '邮箱',
    passwordPlaceholder: '密码',
    save_draft: '保存为草稿',
    select_platform_prompt: '请选择要发布的平台',
    token_batch_title: '标签批量生成',
    prefix_placeholder: '前缀 (可选)',
    generate: '生成',
    export_csv: '导出 CSV',
    shop_not_found: '商家未找到',
    back_to_dashboard: '返回控制台',
    shop_name: '店名',
    loading: '加载中',
    visits_today: '今日访客',
    reviews_today: '今日评价',
    export_visits: '导出访客 CSV'
    ,take_photo_prompt: '拍一张照片来生成更贴合的评价'
    ,take_photo: '拍照'
    ,please_select_platform: '请选择至少一个平台'
    ,ai_generating: 'AI 正在构建你的评价，请稍候...'
    ,ai_failed: 'AI 生成失败'
    ,saved_and_published_prefix: '已保存并模拟发布到 '
    ,saved_draft: '已保存草稿'
    ,save_failed: '保存失败'
    ,copied: '已复制'
    ,copy_failed: '复制失败'
    ,copy: '复制'
    ,previous_step: '上一步'
    ,no_platform_selected: '未选择平台'
    ,generating: '生成中...'
    ,ai_prompt_default: '请生成一段评价'
    ,choose_platform: 'Choose Platform'
    ,ai_generated: 'AI Generated'
    ,take_photo_btn: '拍照'
    ,platform_xiaohongshu: '小红书'
    ,platform_douyin: '抖音'
    ,platform_facebook: 'Facebook'
    ,platform_instagram: 'Instagram'
    ,platform_google: 'Google 地图'
    ,photos_needed_label: '已拍照片'
    ,photos_needed_notify: '还需拍摄更多照片'
    ,click_generate_review: '点击生成评价'
    ,map_title: '位置'
  },
  en: {
    brandTitle: 'Songzike Tool',
    brandSubtitle: 'Merchant Admin',
    brandTitleUpper: 'SONGZIKE TOOL',
    welcome: 'Welcome',
    nfcPrompt: 'Enter text or generate with AI',
    uploadPhoto: 'Upload Photo',
    aiGenerate: 'AI Generate Review',
    login: 'Sign in',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    save_draft: 'Save draft',
    select_platform_prompt: 'Please select platforms to publish',
    token_batch_title: 'Batch Encode Tokens',
    prefix_placeholder: 'Prefix (optional)',
    generate: 'Generate',
    export_csv: 'Export CSV',
    shop_not_found: 'Shop not found',
    back_to_dashboard: 'Back to dashboard',
    shop_name: 'Shop name',
    loading: 'Loading',
    visits_today: 'Visits (today)',
    reviews_today: 'Reviews (today)',
    export_visits: 'Export visits CSV'
    ,take_photo_prompt: 'Take a photo to generate a more tailored review'
    ,take_photo: 'Take Photo'
    ,please_select_platform: 'Please select at least one platform'
    ,ai_generating: 'AI is building your review, please wait...'
    ,ai_failed: 'AI generation failed'
    ,saved_and_published_prefix: 'Saved and simulated publish to '
    ,saved_draft: 'Saved draft'
    ,save_failed: 'Save failed'
    ,copied: 'Copied'
    ,copy_failed: 'Copy failed'
    ,copy: 'Copy'
    ,previous_step: 'Previous'
    ,no_platform_selected: 'No platform selected'
    ,generating: 'Generating...'
    ,ai_prompt_default: 'Please generate a review'
    ,choose_platform: 'Choose Platform'
    ,ai_generated: 'AI Generated'
    ,take_photo_btn: 'Take Photo'
    ,ready_to_publish: 'Ready to publish the following content:'
    ,next_open_platform: 'Next: Open platform'
    ,publish_failed: 'Publish failed'
    ,platform_xiaohongshu: 'Rednote'
    ,platform_douyin: 'Douyin'
    ,platform_facebook: 'Facebook'
    ,platform_instagram: 'Instagram'
    ,platform_google: 'Google Maps'
    ,photos_needed_label: 'Photos taken'
    ,photos_needed_notify: 'Please take more photos'
    ,click_generate_review: 'Click to generate review'
    ,map_title: 'Location'
  }
}

export function t(key) {
  const lang = (typeof window !== 'undefined' && localStorage.getItem('sz_lang')) || 'en'
  return (translations[lang] && translations[lang][key]) || translations['zh'][key] || key
}

export function getLang() {
  return (typeof window !== 'undefined' && localStorage.getItem('sz_lang')) || 'en'
}



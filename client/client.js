/**
 * dsh-novel-studio client half.
 *
 * Three registrations:
 *  - sidebar.panellist: the "Novel" icon under Plugins, opening the main panel
 *  - main: the workbench panel (enable, charts, help, quick settings)
 *  - shell.overlay: the story-map / help modal with tab + prev/next switching
 *
 * Charts are hand-drawn SVG: no third-party chart library, no Harness client
 * package imports, only theme tokens for colors. The module is plain JS with
 * React.createElement (no JSX, no build step).
 */

window.__ModuleLoader__.load({
  id: 'dsh-novel-studio',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = React

    const NS = 'novel-studio'
    const VIEWS = ['charts', 'help']
    const CHART_TABS = ['story', 'relations', 'pacing', 'metrics']

    // ---------------------------------------------------------------------
    // Locale
    // ---------------------------------------------------------------------
    const ZH = {
      nav: '小说创作',
      panelTitle: '小说创作工作台',
      panelSubtitle: '写小说时提供模板、大纲/章纲/正文流水线、多智能体审稿与故事图谱。',
      notEnabled: '当前工作区还没有小说项目。',
      enabled: '已启用',
      project: '项目',
      stage: '阶段',
      chapters: '章纲',
      chapterWords: '每章字数',
      rounds: '审稿轮次',
      enable: '启用小说创作工作台',
      enabling: '正在启用…',
      openCharts: '查看故事图谱',
      openHelp: '使用说明',
      refresh: '刷新',
      settings: '快捷设置',
      threshold: 'AI 味阈值',
      autoChart: '生成后自动打开图谱',
      autoHelp: '启用时自动显示说明',
      save: '保存设置',
      saved: '已保存',
      recent: '最近项目',
      noProjects: '暂无项目；到对话里说「我想写小说」或点上面的启用按钮。',
      triggerHint: '提示：在对话里说「我想写小说」也会自动询问是否启用。',
      guideTitle: '小说工作台',
      guideBody: '在对话里说「我想写小说」，或点侧边栏的小说图标打开工作台。',
      guideOpen: '打开使用说明',
      overlayChartTab: '故事图谱',
      overlayHelpTab: '使用说明',
      prev: '上一个',
      next: '下一个',
      close: '关闭',
      position: '位置',
      emptyChart: '还没有可绘制的数据。完成大纲或章纲后，图谱会自动出现。',
      loading: '加载中…',
      loadFailed: '加载失败，请确认会话已启动 Web 服务。',
      chartSummary: '解读',
      storyTitle: '故事线 / 情绪曲线',
      relationsTitle: '人物关系图',
      pacingTitle: '节奏与篇幅',
      metricsTitle: '审校指标趋势',
      storyHint: '横轴是章节，纵轴是张力（0–100）；菱形标记章末钩子强度 ≥ 70。',
      relationsHint: '节点越大出场越多，连线越粗关系越强，虚线表示对立关系。',
      pacingHint: '柱子是每章字数，折线是钩子强度；理想状态是柱高稳定、折线有起伏。',
      metricsHint: '实线 AI 味得分、虚线可读性，越高越好；参考线是常用阈值。',
      legend: '图例',
      chapterLabel: '章',
      tension: '张力',
      hook: '钩子',
      words: '字数',
      aiScore: 'AI 味得分',
      readability: '可读性',
      reload: '重新加载',
      helpIntro: '这份说明会陪你把一本书从想法推到正文。',
      outputMode: '输出方式',
      outputModeFile: '保存 TXT + 自动弹窗',
      outputModeChat: '对话直出（仍保存 TXT）',
      outputDir: '保存目录（留空 = 项目目录）',
      autoPopup: '保存后自动弹窗',
      openText: '查看最近文本',
      lastOutput: '最近输出',
      textTitle: '文本预览',
      textEmpty: '还没有生成文本。完成大纲或章纲后会自动出现在这里。',
      copy: '复制',
      copied: '已复制',
      textClose: '关闭',
      rolesTitle: '审稿角色（自由勾选）',
      rolesHint: '勾选要参与审稿的子智能体；清空表示使用默认子集。两个工艺角色（通顺度/AI 味）始终保留。',
      roleGroupPlatform: '平台与读者',
      roleGroupBusiness: '商业与运营',
      roleGroupCraft: '工艺与质检',
      selectAll: '全选',
      clearAll: '清空（用默认）',
      roleCount: '已选',
      continueSession: '在当前会话继续',
      badgeReady: '已启用',
      badgeIdle: '未启用',
      expandRoles: '展开选择',
      collapseRoles: '收起',
      searchRoles: '搜索角色名或职责…',
      rolesDefault: '未选角色：使用默认子集（可在下方展开自由勾选）',
      roundsHint: '每轮审稿跑一遍子智能体',
      wordsHint: '正文按 ±10% 校验',
      thresholdHint: '低于阈值需继续改',
      outputHint: '留空 = 项目目录；须在工作区内',
      on: '开启',
      off: '关闭',
      panelTheme: '界面主题',
      themeAuto: '跟随宿主',
      themeLight: '浅色',
      themeDark: '深色（墨绿）',
      rightCharts: '图谱',
      rightHooks: '钩子',
      rightText: '文本',
      rightStyle: '风格',
      rightSettings: '设置',
      rightHelp: '说明',
      styleEmpty: '还没有学习过改稿。粘贴用户改好的章节，插件会比对并记住写作偏好。',
      learnStyle: '回输改稿',
      stylePlaceholder: '把改好的章节全文粘贴到这里…',
      chapterNo: '章号',
      learnButton: '学习这篇改稿',
      clearStyle: '清空记忆',
      confirmClear: '确认清空',
      newProject: '新建小说',
      createProject: '创建项目',
      createHint: '创建后回到对话说「继续写《书名》」即可开始。',
      hooksEmpty: '还没有钩子记录。生成章纲或正文后会自动记录，便于自查伏笔与悬念。',
      hookOpen: '未回收',
      hookResolved: '已回收',
      hooksOpen: '未回收',
      twist: '跳脱值',
      twistHint: '0 稳定 · 100 反套路；过高会提示检查',
      twistWarn: '跳脱值偏高，剧情可能偏离预期',
    }

    const EN = {
      nav: 'Novel',
      panelTitle: 'Novel Studio',
      panelSubtitle: 'Templates, an outline/chapter/draft pipeline, multi-agent review, and story maps for fiction.',
      notEnabled: 'No novel project in this workspace yet.',
      enabled: 'Enabled',
      project: 'Project',
      stage: 'Stage',
      chapters: 'Outlines',
      chapterWords: 'Words/chapter',
      rounds: 'Review rounds',
      enable: 'Enable Novel Studio',
      enabling: 'Enabling…',
      openCharts: 'Open story map',
      openHelp: 'Help',
      refresh: 'Refresh',
      settings: 'Quick settings',
      threshold: 'AI-flavor threshold',
      autoChart: 'Auto-open the story map after generation',
      autoHelp: 'Show help when enabled',
      save: 'Save settings',
      saved: 'Saved',
      recent: 'Recent projects',
      noProjects: 'No projects yet. Say “I want to write a novel” in chat, or use the enable button above.',
      triggerHint: 'Tip: saying “I want to write a novel” in chat also asks whether to enable it.',
      guideTitle: 'Novel Studio',
      guideBody: 'Say “I want to write a novel” in chat, or click the novel icon in the sidebar.',
      guideOpen: 'Open help',
      overlayChartTab: 'Story map',
      overlayHelpTab: 'Help',
      prev: 'Previous',
      next: 'Next',
      close: 'Close',
      position: 'View',
      emptyChart: 'Nothing to draw yet. Finish an outline or chapter plan and the map appears here.',
      loading: 'Loading…',
      loadFailed: 'Could not load. Make sure the session web server is running.',
      chartSummary: 'Reading',
      storyTitle: 'Story line / tension',
      relationsTitle: 'Character relations',
      pacingTitle: 'Pacing & length',
      metricsTitle: 'Review trend',
      storyHint: 'X is chapter, Y is tension (0–100); diamonds mark chapter-end hooks ≥ 70.',
      relationsHint: 'Bigger nodes appear more; thicker edges are stronger bonds; dashed edges oppose.',
      pacingHint: 'Bars are chapter words, the line is hook strength.',
      metricsHint: 'Solid is AI-flavor score, dashed is readability; higher is better.',
      legend: 'Legend',
      chapterLabel: 'Ch.',
      tension: 'Tension',
      hook: 'Hook',
      words: 'Words',
      aiScore: 'AI-flavor score',
      readability: 'Readability',
      reload: 'Reload',
      helpIntro: 'This guide takes a book from an idea to a draft.',
      outputMode: 'Output',
      outputModeFile: 'Save TXT + popup',
      outputModeChat: 'Print in chat (still saved)',
      outputDir: 'Save directory (empty = project folder)',
      autoPopup: 'Auto-open the TXT preview',
      openText: 'Open latest text',
      lastOutput: 'Latest output',
      textTitle: 'Text preview',
      textEmpty: 'No generated text yet. Finish an outline or chapter plan and it appears here.',
      copy: 'Copy',
      copied: 'Copied',
      textClose: 'Close',
      rolesTitle: 'Reviewers (choose freely)',
      rolesHint: 'Pick the reviewer subagents for review rounds; empty means the default preset. The two craft reviewers always stay.',
      roleGroupPlatform: 'Platform & readers',
      roleGroupBusiness: 'Business & operations',
      roleGroupCraft: 'Craft & quality',
      selectAll: 'Select all',
      clearAll: 'Clear (default)',
      roleCount: 'Selected',
      continueSession: 'Continue in this chat',
      badgeReady: 'Enabled',
      badgeIdle: 'Not enabled',
      expandRoles: 'Choose',
      collapseRoles: 'Collapse',
      searchRoles: 'Search by name or duty…',
      rolesDefault: 'No reviewers picked: the default preset is used (expand to choose freely).',
      roundsHint: 'Subagents per review round',
      wordsHint: 'Draft checked within ±10%',
      thresholdHint: 'Below it needs another rewrite',
      outputHint: 'Empty = project folder; must stay in the workspace',
      on: 'On',
      off: 'Off',
      panelTheme: 'Panel theme',
      themeAuto: 'Follow host',
      themeLight: 'Light',
      themeDark: 'Dark green',
      rightCharts: 'Map',
      rightHooks: 'Hooks',
      rightText: 'Text',
      rightStyle: 'Style',
      rightSettings: 'Settings',
      rightHelp: 'Help',
      styleEmpty: 'No style memory yet. Paste an edited chapter and the plugin will diff it and remember your preferences.',
      learnStyle: 'Learn from revision',
      stylePlaceholder: 'Paste the edited chapter here…',
      chapterNo: 'Ch',
      learnButton: 'Learn',
      clearStyle: 'Clear',
      confirmClear: 'Confirm clear',
      newProject: 'New novel',
      createProject: 'Create',
      createHint: 'Then return to the chat and say "continue writing <title>".',
      hooksEmpty: 'No hooks recorded yet. Chapter plans and drafts record them automatically for self-review.',
      hookOpen: 'Open',
      hookResolved: 'Resolved',
      hooksOpen: 'Open',
      twist: 'Twist',
      twistHint: '0 stable · 100 unexpected; very high values trigger a check',
      twistWarn: 'High twist: turns may deviate from expectations',
    }

    // ---------------------------------------------------------------------
    // Help content (rendered as plain React nodes, never HTML)
    // ---------------------------------------------------------------------
    function helpSections(locale) {
      if (locale === 'en') {
        return [
          { title: '1. Start', items: ['Say “I want to write a novel” in chat: the plugin asks whether to enable.', 'Or click the Novel icon in the sidebar, then “Enable Novel Studio”.'] },
          { title: '2. Fill the template', items: ['Pick one or more routes, answer dimensions by id (A1, B1…), describe freely, or paste your own outline.', 'Conflicts (first person + omniscient, literary platform + power fantasy) are flagged for you to arbitrate.'] },
          { title: '3. Generate', items: ['brief → outline → chapter_outline → draft.', 'Chapter outlines can be any count you ask for (cap 500 by default).', 'Results are saved as TXT (custom directory supported) and auto-open in a preview popup; you can turn the popup off.', 'Switch Output to “Print in chat” to keep the TXT and also paste the full text into the reply.'] },
          { title: '4. Review', items: ['review_plan returns reviewers; run them in parallel with the workflow tool.', 'Merge: a finding raised by 2+ reviewers, or a compliance/logic blocker, must be fixed.', 'Rewrite, then scan again until the AI-flavor score clears the threshold.'] },
          { title: '5. Story map', items: ['Story line, relations, pacing and review trend, switched by tabs or the Previous/Next buttons.', 'The map opens automatically after chart data is updated (configurable).'] },
          { title: '6. AI flavor & readability', items: ['novel_scan is deterministic: it lists phrase hits, sentence lengths, long-sentence ratio and readability.', 'Two craft reviewers (flow-readability and AI-flavor hunter) join every review round.'] },
        ]
      }
      return [
        {
          title: '1. 怎么开始',
          items: [
            '在对话里说「我想写小说」「帮我写部小说」：插件会先问是否启用，选「暂不启用」不会创建任何文件。',
            '或者点左侧栏「插件」下方的小说图标，打开工作台后点「启用小说创作工作台」。',
          ],
        },
        {
          title: '2. 模板怎么填',
          items: [
            '可以选一个或多个路线预设；也可以按编号回答维度（例如 A1 朴素、冷峻；B1 第三人称限知）；也可以直接用自己的话描述，或贴上你已经写好的大纲。',
            '如果选项互相冲突（第一人称+全知、纯文学平台+爽文题材、短篇+超长单章），插件会标出来让你裁决。',
            '每章字数、总字数、总章数、审稿轮次都可以在这一步定。',
          ],
        },
        {
          title: '3. 生成顺序',
          items: [
            '设定卡 → 全书大纲 → 章纲 → 正文。每一步都由主模型写，插件给出结构要求、反 AI 味约束与落盘路径。',
            '章纲数量任意（默认上限 500）：例如「一次生成 30 章」「一次 100 章」，插件按每章字数分配情节点密度。',
            '结果自动写成 TXT：默认存项目目录，面板可改「保存目录」；保存后自动弹窗显示全文（可关闭自动弹窗，或点「查看最近文本」）。',
            '「输出方式」切到「对话直出」后，文本仍保存 TXT 供审稿续写，但模型会把全文直接贴回对话框。',
          ],
        },
        {
          title: '4. 审稿怎么跑',
          items: [
            '生成后调用 novel_studio(action="review_plan")：返回本轮角色、每个角色的完整提示词，以及可直接用于 workflow 工具的并行脚本。',
            '子智能体各自读文件、提结构化意见；主模型按整合规则合并：2 个以上角色提出、或合规/逻辑硬伤，一律必修。',
            '改写后必须用 novel_scan 复扫，指标不达标就继续改。审稿轮次默认 2，可设 0–4。',
          ],
        },
        {
          title: '5. 图谱怎么看',
          items: [
            '故事线：横轴章号、纵轴张力，菱形是章末钩子；连续低张力会标出来提醒追读流失。',
            '人物关系：节点大小代表出场量，连线粗细代表关系强度，虚线是对立；悬停可看关系名。',
            '节奏与篇幅：柱子是每章字数，折线是钩子强度；理想状态是柱高稳定、折线有起伏。',
            '审校指标：AI 味得分与可读性随轮次变化，参考线是常用阈值。',
          ],
        },
        {
          title: '6. AI 味与可读性',
          items: [
            'novel_scan 是确定性扫描：套话命中（带行号）、平均句长、长句占比、对话占比、成语/比喻密度、指代密度。',
            '两个专属审稿角色每轮都在：「通顺度与可读性审校员」查逻辑断裂、指代不清、晦涩难懂；「AI 味猎手」查套话与机械转折。',
            '扫描只是辅助：它给的是可执行的修改方向，不是自动改写。',
          ],
        },
      ]
    }

    // ---------------------------------------------------------------------
    // Cross-component store
    // ---------------------------------------------------------------------
    const store = {
      state: { open: false, view: 'charts', tab: 'story', textOpen: false, rightView: 'charts' },
      listeners: new Set(),
      set(patch) {
        store.state = { ...store.state, ...patch }
        for (const listener of store.listeners) listener()
      },
      subscribe(listener) {
        store.listeners.add(listener)
        return () => store.listeners.delete(listener)
      },
    }

    function useStore() {
      const [, force] = useState(0)
      useEffect(() => store.subscribe(() => force((value) => value + 1)), [])
      return store.state
    }

    /** Map the panel theme preference onto a class that re-scopes theme tokens. */
    function panelThemeClass(value) {
      if (value === 'light') return 'nvs-theme-light'
      if (value === 'dark') return 'nvs-theme-dark'
      return ''
    }

    // ---------------------------------------------------------------------
    // API
    // ---------------------------------------------------------------------
    function apiUrl(pathname) {
      const base = window.location.origin
      return `${base}${pathname}`
    }

    async function getJson(pathname) {
      const response = await fetch(apiUrl(pathname), { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }

    async function postJson(pathname, body) {
      const response = await fetch(apiUrl(pathname), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.ok === false) throw new Error(data.error || `HTTP ${response.status}`)
      return data
    }

    // ---------------------------------------------------------------------
    // Styles (registered once through the plugin's effect)
    // ---------------------------------------------------------------------
    const CSS = `
.nvs-overlay{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;pointer-events:auto;background:rgba(10,18,28,.42);padding:18px}
.nvs-card{width:min(780px,94vw);max-height:86vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1f2328);border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.30);overflow:hidden}
.nvs-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e3e6ea);background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.nvs-title{font-weight:600;font-size:15px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nvs-tabs{display:flex;gap:6px;padding:10px 16px 0;flex-wrap:wrap}
.nvs-tab{border:1px solid var(--dsw-alias-border-l1,#e3e6ea);background:transparent;color:var(--dsw-alias-label-secondary,#5b6470);border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer}
.nvs-tab.on{background:var(--dsw-alias-brand-primary,#2f6f5e);border-color:var(--dsw-alias-brand-primary,#2f6f5e);color:#fff}
.nvs-switch{display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e3e6ea)}
.nvs-switch-btn{border:1px solid var(--dsw-alias-border-l1,#e3e6ea);background:var(--dsw-alias-bg-layer-2,#f6f7f9);color:var(--dsw-alias-label-primary,#1f2328);border-radius:8px;padding:5px 12px;font-size:12.5px;cursor:pointer}
.nvs-switch-btn:disabled{opacity:.45;cursor:default}
.nvs-counter{margin-left:auto;font-size:12px;color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-body{padding:14px 16px 18px;overflow:auto;flex:1;min-height:0}
.nvs-h3{font-size:13px;font-weight:600;margin:0 0 6px}
.nvs-hint{font-size:12px;color:var(--dsw-alias-label-secondary,#5b6470);margin:0 0 8px;line-height:1.6}
.nvs-empty{padding:28px 12px;text-align:center;font-size:13px;color:var(--dsw-alias-label-secondary,#5b6470);line-height:1.8}
.nvs-legend{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--dsw-alias-label-secondary,#5b6470);margin-top:8px}
.nvs-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px;vertical-align:middle}
.nvs-close{border:none;background:transparent;color:var(--dsw-alias-label-secondary,#5b6470);font-size:18px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:6px}
.nvs-close:hover{background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.nvs-panel{padding:18px 20px;max-width:720px;margin:0 auto;color:var(--dsw-alias-label-primary,#1f2328)}
.nvs-panel h2{font-size:17px;margin:0 0 4px}
.nvs-sub{font-size:12.5px;color:var(--dsw-alias-label-secondary,#5b6470);line-height:1.7;margin:0 0 16px}
.nvs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}
.nvs-stat{border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:12px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.nvs-stat b{display:block;font-size:16px;margin-top:2px}
.nvs-stat span{font-size:11.5px;color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.nvs-btn{border:1px solid var(--dsw-alias-border-l1,#e3e6ea);background:var(--dsw-alias-bg-layer-2,#f6f7f9);color:var(--dsw-alias-label-primary,#1f2328);border-radius:10px;padding:8px 14px;font-size:13px;cursor:pointer}
.nvs-btn.primary{background:var(--dsw-alias-brand-primary,#2f6f5e);border-color:var(--dsw-alias-brand-primary,#2f6f5e);color:#fff}
.nvs-btn:disabled{opacity:.5;cursor:default}
.nvs-section{border-top:1px solid var(--dsw-alias-border-l1,#e3e6ea);padding-top:14px;margin-top:14px}
.nvs-section h3{font-size:13px;margin:0 0 8px}
.nvs-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0;font-size:12.5px}
.nvs-row label{min-width:120px;color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-input{width:100px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:8px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#1f2328)}
.nvs-check{display:flex;align-items:center;gap:6px}
.nvs-note{font-size:12px;color:var(--dsw-alias-label-secondary,#5b6470);line-height:1.7}
.nvs-list{margin:0;padding-left:18px;font-size:12.5px;line-height:1.9;color:var(--dsw-alias-label-primary,#1f2328)}
.nvs-help h4{font-size:13px;margin:14px 0 4px}
.nvs-warn{color:var(--dsw-alias-state-warn-primary,#b45309);font-size:12px;margin-top:8px}
.nvs-project{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed var(--dsw-alias-border-l1,#e3e6ea);padding:7px 0;font-size:12.5px}
.nvs-project small{color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-pre{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12.5px;line-height:1.85;background:var(--dsw-alias-bg-layer-2,#f6f7f9);border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:10px;padding:12px;max-height:58vh;overflow:auto;margin:0}
.nvs-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:11.5px;color:var(--dsw-alias-label-secondary,#5b6470);margin:0 0 8px}
.nvs-select{padding:5px 8px;border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:8px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#1f2328);font-size:12.5px}
.nvs-input.wide{width:220px}
.nvs-roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:5px 14px;margin:6px 0 10px}
.nvs-role{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--dsw-alias-label-primary,#1f2328)}
.nvs-role small{color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-role-group{font-size:12px;font-weight:600;margin:12px 0 2px;color:var(--dsw-alias-label-secondary,#5b6470)}

/* --- v2 workbench surface ------------------------------------------------ */
.nvs-panel{padding:22px 22px 30px;max-width:840px;margin:0 auto;color:var(--dsw-alias-label-primary,#1f2328)}
.nvs-hero{display:flex;gap:14px;align-items:flex-start;padding:18px;border-radius:18px;border:1px solid var(--dsw-alias-border-l1,#e3e6ea);background:linear-gradient(135deg,var(--dsw-alias-bg-layer-2,#f6f7f9),var(--dsw-alias-bg-layer-1,#fff));box-shadow:inset 3px 0 0 var(--dsw-alias-brand-primary,#2f6f5e)}
.nvs-hero-icon{width:48px;height:48px;border-radius:15px;display:flex;align-items:center;justify-content:center;color:#fff;background:var(--dsw-alias-brand-primary,#2f6f5e);flex:none}
.nvs-hero-main{flex:1;min-width:0}
.nvs-hero h2{font-size:18px;margin:0 0 4px;line-height:1.3}
.nvs-hero p{font-size:12.5px;color:var(--dsw-alias-label-secondary,#5b6470);line-height:1.65;margin:0}
.nvs-hero-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex:none}
.nvs-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:11.5px;border:1px solid var(--dsw-alias-border-l1,#e3e6ea);color:var(--dsw-alias-label-secondary,#5b6470);background:var(--dsw-alias-bg-layer-1,#fff);white-space:nowrap}
.nvs-badge.on{color:var(--dsw-alias-state-success-primary,#1a7f37);border-color:var(--dsw-alias-state-success-primary,#1a7f37);background:transparent}
.nvs-badge.off{color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-panel-card{border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:16px;padding:16px;background:var(--dsw-alias-bg-layer-1,#fff);margin:14px 0}
.nvs-card-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.nvs-card-head h3{font-size:13.5px;margin:0;flex:1;min-width:0}
.nvs-card-sub{font-size:12px;color:var(--dsw-alias-label-secondary,#5b6470);line-height:1.65;margin:-2px 0 10px}
.nvs-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px;margin:10px 0}
.nvs-stat{border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:12px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.nvs-stat span{display:block;font-size:11.5px;color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-stat b{display:block;font-size:16px;margin-top:3px;line-height:1.25;word-break:break-word}
.nvs-progress{height:6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,#f6f7f9);overflow:hidden;margin:10px 0 4px}
.nvs-progress i{display:block;height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary,#2f6f5e);transition:width .35s ease}
.nvs-primary{border:1px solid var(--dsw-alias-brand-primary,#2f6f5e);background:var(--dsw-alias-brand-primary,#2f6f5e);color:#fff;border-radius:12px;padding:10px 18px;font-size:13.5px;font-weight:600;cursor:pointer;transition:opacity .15s ease,transform .15s ease}
.nvs-primary:hover{opacity:.92}
.nvs-primary:active{transform:translateY(1px)}
.nvs-primary:disabled{opacity:.55;cursor:default}
.nvs-btn{border:1px solid var(--dsw-alias-border-l1,#e3e6ea);background:var(--dsw-alias-bg-layer-2,#f6f7f9);color:var(--dsw-alias-label-primary,#1f2328);border-radius:10px;padding:8px 13px;font-size:12.5px;cursor:pointer;transition:background .15s ease,border-color .15s ease}
.nvs-btn:hover{border-color:var(--dsw-alias-border-l2,#c9ced6);background:var(--dsw-alias-bg-layer-1,#fff)}
.nvs-btn:disabled{opacity:.5;cursor:default}
.nvs-field{display:grid;grid-template-columns:158px 1fr;align-items:center;gap:10px;margin:10px 0}
.nvs-field-label{font-size:12.5px;color:var(--dsw-alias-label-secondary,#5b6470);line-height:1.5}
.nvs-field-label small{display:block;font-size:11px;color:var(--dsw-alias-label-secondary,#5b6470);opacity:.8;margin-top:2px}
.nvs-field-control{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.nvs-step{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-base,#fff)}
.nvs-step button{border:none;background:transparent;color:var(--dsw-alias-label-primary,#1f2328);width:30px;height:30px;font-size:15px;line-height:1;cursor:pointer}
.nvs-step button:hover{background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.nvs-step button:disabled{opacity:.35;cursor:default}
.nvs-step input{width:58px;height:30px;border:none;border-left:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-right:1px solid var(--dsw-alias-border-l1,#e3e6ea);text-align:center;font-size:12.5px;background:transparent;color:var(--dsw-alias-label-primary,#1f2328);outline:none}
.nvs-range{width:130px;accent-color:var(--dsw-alias-brand-primary,#2f6f5e);cursor:pointer}
.nvs-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:10px;overflow:hidden;background:var(--dsw-alias-bg-base,#fff)}
.nvs-seg button{border:none;background:transparent;color:var(--dsw-alias-label-secondary,#5b6470);padding:7px 13px;font-size:12.5px;cursor:pointer}
.nvs-seg button.on{background:var(--dsw-alias-brand-primary,#2f6f5e);color:#fff}
.nvs-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.nvs-chip{border:1px solid var(--dsw-alias-border-l1,#e3e6ea);background:var(--dsw-alias-bg-layer-2,#f6f7f9);color:var(--dsw-alias-label-primary,#1f2328);border-radius:999px;padding:4px 11px;font-size:12px;cursor:pointer;transition:all .12s ease;white-space:nowrap}
.nvs-chip:hover{border-color:var(--dsw-alias-brand-primary,#2f6f5e)}
.nvs-chip.on{background:var(--dsw-alias-brand-primary,#2f6f5e);border-color:var(--dsw-alias-brand-primary,#2f6f5e);color:#fff}
.nvs-search{width:100%;box-sizing:border-box;padding:7px 11px;border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:10px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#1f2328);font-size:12.5px;margin:2px 0 8px}
.nvs-role-group-title{font-size:11.5px;font-weight:600;letter-spacing:.02em;margin:10px 0 4px;color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-toast{display:inline-flex;align-items:center;gap:5px;color:var(--dsw-alias-state-success-primary,#1a7f37);font-size:12px}
.nvs-error{display:flex;align-items:flex-start;gap:8px;border:1px solid var(--dsw-alias-state-error-primary,#c0392b);background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-state-error-primary,#c0392b);border-radius:10px;padding:8px 10px;font-size:12px;line-height:1.6;margin:12px 0}
.nvs-error button{margin-left:auto;border:none;background:transparent;color:inherit;cursor:pointer;font-size:14px;line-height:1}
.nvs-divider{height:1px;background:var(--dsw-alias-border-l1,#e3e6ea);margin:14px 0}
.nvs-kv{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;padding:7px 0;border-bottom:1px dashed var(--dsw-alias-border-l1,#e3e6ea)}
.nvs-kv:last-child{border-bottom:none}
.nvs-kv small{color:var(--dsw-alias-label-secondary,#5b6470);white-space:nowrap}
.nvs-pre{font-size:var(--nvs-pre-size,13px)}
@media (max-width:640px){
  .nvs-panel{padding:14px 12px 22px}
  .nvs-hero{padding:14px;gap:11px}
  .nvs-hero h2{font-size:16.5px}
  .nvs-hero-side{flex-direction:row;align-items:center}
  .nvs-field{grid-template-columns:1fr;gap:5px}
  .nvs-range{width:110px}
  .nvs-card{width:96vw}
}

/* --- warm / branded accents (theme-token driven, never hard-coded black) --- */
.nvs-panel{background:radial-gradient(900px 340px at 6% -10%,color-mix(in srgb,var(--dsw-alias-brand-primary,#2f6f5e) 9%,transparent),transparent 72%)}
.nvs-hero{background:var(--dsw-alias-bg-layer-1,#fff);background:linear-gradient(135deg,color-mix(in srgb,var(--dsw-alias-brand-primary,#2f6f5e) 13%,var(--dsw-alias-bg-layer-1,#fff)),var(--dsw-alias-bg-layer-1,#fff) 70%)}
.nvs-panel-card{box-shadow:0 1px 2px rgba(0,0,0,.04)}
.nvs-card-head h3{letter-spacing:.01em}
.nvs-badge.on{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#1a7f37) 12%,transparent)}
.nvs-primary{box-shadow:0 6px 16px color-mix(in srgb,var(--dsw-alias-brand-primary,#2f6f5e) 22%,transparent)}
.nvs-primary:hover{filter:brightness(1.05)}
.nvs-head{background:var(--dsw-alias-bg-layer-2,#f6f7f9);background:linear-gradient(135deg,color-mix(in srgb,var(--dsw-alias-brand-primary,#2f6f5e) 7%,var(--dsw-alias-bg-layer-2,#f6f7f9)),var(--dsw-alias-bg-layer-2,#f6f7f9))}
.nvs-overlay{background:rgba(10,18,28,.34);backdrop-filter:blur(3px)}
.nvs-pre{border-left:3px solid var(--dsw-alias-brand-primary,#2f6f5e)}
.nvs-tab.on{box-shadow:0 3px 10px color-mix(in srgb,var(--dsw-alias-brand-primary,#2f6f5e) 25%,transparent)}
.nvs-switch-btn:hover{border-color:var(--dsw-alias-brand-primary,#2f6f5e);color:var(--dsw-alias-brand-primary,#2f6f5e)}
.nvs-stat b{color:var(--dsw-alias-label-primary,#1f2328)}
.nvs-kv span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* --- scrollable host pane + calmer surface ------------------------------- */
.nvs-panel{height:100%;max-height:100%;min-height:0;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2,#c9ced6) transparent;background:transparent}
.nvs-panel::-webkit-scrollbar{width:8px;height:8px}
.nvs-panel::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2,#c9ced6);border-radius:999px}
.nvs-panel::-webkit-scrollbar-track{background:transparent}
.nvs-hero{background:var(--dsw-alias-bg-layer-1,#fff);border-radius:14px;padding:16px;box-shadow:inset 3px 0 0 var(--dsw-alias-brand-primary,#2f6f5e)}
.nvs-hero-icon{width:44px;height:44px;border-radius:13px}
.nvs-panel-card{border-radius:14px;margin:12px 0;box-shadow:none;background:var(--dsw-alias-bg-layer-1,#fff)}
.nvs-head{background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.nvs-stat{border:none;background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.nvs-toast{white-space:nowrap}
.nvs-actions{margin:12px 0}

/* --- scoped panel themes: never pure black; tokens re-declared per surface */
.nvs-theme-light{
  --dsw-alias-bg-base:#ffffff;
  --dsw-alias-bg-layer-1:#ffffff;
  --dsw-alias-bg-layer-2:#f5f7f6;
  --dsw-alias-bg-overlay:#ffffff;
  --dsw-alias-label-primary:#1f2328;
  --dsw-alias-label-secondary:#5b6470;
  --dsw-alias-border-l1:#e3e6ea;
  --dsw-alias-border-l2:#c9ced6;
  --dsw-alias-brand-primary:#2f6f5e;
  --dsw-alias-state-success-primary:#1a7f37;
  --dsw-alias-state-error-primary:#c0392b;
  --dsw-alias-state-warn-primary:#b45309;
  --dsw-alias-state-idle-primary:#8a94a0;
}
.nvs-theme-dark{
  --dsw-alias-bg-base:#121a16;
  --dsw-alias-bg-layer-1:#17221d;
  --dsw-alias-bg-layer-2:#1e2b25;
  --dsw-alias-bg-overlay:#1e2b25;
  --dsw-alias-label-primary:#e8f0ec;
  --dsw-alias-label-secondary:#9db0a7;
  --dsw-alias-border-l1:#2a3a33;
  --dsw-alias-border-l2:#3c5147;
  --dsw-alias-brand-primary:#57b894;
  --dsw-alias-state-success-primary:#4ade80;
  --dsw-alias-state-error-primary:#f87171;
  --dsw-alias-state-warn-primary:#fbbf24;
  --dsw-alias-state-idle-primary:#8fa39b;
}
.nvs-panel.nvs-theme-light,.nvs-panel.nvs-theme-dark{background:var(--dsw-alias-bg-base)}
.nvs-overlay.nvs-theme-light,.nvs-overlay.nvs-theme-dark{background:rgba(8,14,12,.38)}

/* --- layout polish: centered hero, clear button hierarchy ----------------- */
.nvs-panel{padding:20px 22px 46px}
.nvs-hero{position:relative;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:24px 18px 18px}
.nvs-hero-refresh{position:absolute;top:12px;right:12px;font-size:12px;padding:6px 10px}
.nvs-hero h2{font-size:19px;margin:0}
.nvs-hero p{max-width:560px;margin:2px 0 0}
.nvs-hero-icon{width:52px;height:52px;border-radius:16px}
.nvs-hero-side{flex-direction:row;align-items:center;justify-content:center}
.nvs-primary.nvs-wide{width:100%;display:inline-flex;align-items:center;justify-content:center;padding:11px 18px;font-size:14px}
.nvs-actions{gap:10px}
.nvs-actions .nvs-btn{min-height:34px}
.nvs-stat{padding-left:14px;position:relative}
.nvs-stat::before{content:'';position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:3px;background:var(--dsw-alias-brand-primary,#2f6f5e);opacity:.6}
.nvs-card-head h3{position:relative;padding-left:10px}
.nvs-card-head h3::before{content:'';position:absolute;left:0;top:2px;bottom:2px;width:3px;border-radius:2px;background:var(--dsw-alias-brand-primary,#2f6f5e)}
.nvs-field{padding:5px 7px;border-radius:9px;transition:background .15s ease}
.nvs-field:hover{background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.nvs-search:focus,.nvs-step input:focus,.nvs-seg button:focus-visible{outline:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#2f6f5e) 35%,transparent);outline-offset:1px}
.nvs-badge{padding:3px 10px}
.nvs-panel-card{padding:16px 16px 18px}

/* --- right sidebar panel ------------------------------------------------- */
.nvs-right{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#1f2328)}
.nvs-right-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1,#e3e6ea);background:var(--dsw-alias-bg-layer-2,#f6f7f9)}
.nvs-right-title{flex:1;min-width:0;font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nvs-right-body{flex:1;min-height:0;overflow:auto;padding:12px;box-sizing:border-box}
.nvs-right .nvs-pre{max-height:none}
.nvs-right .nvs-field{grid-template-columns:1fr;gap:4px}
.nvs-right .nvs-field-label{font-size:12px}
.nvs-hook{border:1px solid var(--dsw-alias-border-l1,#e3e6ea);border-radius:10px;padding:8px 10px;margin:6px 0;background:var(--dsw-alias-bg-layer-1,#fff)}
.nvs-hook-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.nvs-hook-ch{font-size:11.5px;color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-hook-title{font-size:12.5px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nvs-hook-text{font-size:12px;line-height:1.65;margin:4px 0 0;color:var(--dsw-alias-label-secondary,#5b6470)}
.nvs-twist{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nvs-twist-val{font-weight:600;font-size:12.5px;min-width:34px;text-align:right}
.nvs-warnbar{border:1px solid var(--dsw-alias-state-warn-primary,#b45309);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b45309) 10%,transparent);color:var(--dsw-alias-state-warn-primary,#b45309);border-radius:10px;padding:8px 10px;font-size:12px;line-height:1.6;margin:8px 0;display:flex;gap:8px;align-items:flex-start}

/* --- contrast fixes: never rely on a theme token that may be white-on-white */
.nvs-primary{background:#2f6f5e;border-color:#2f6f5e;color:#fff}
.nvs-primary:hover{background:#3a816d;filter:none}
.nvs-tab.on{background:#2f6f5e;border-color:#2f6f5e;color:#fff}
.nvs-seg button.on{background:#2f6f5e;color:#fff}
.nvs-chip.on{background:#2f6f5e;border-color:#2f6f5e;color:#fff}
.nvs-theme-dark .nvs-primary{background:#57b894;border-color:#57b894;color:#0f1512}
.nvs-theme-dark .nvs-primary:hover{background:#6cc9a5}
.nvs-theme-dark .nvs-tab.on{background:#57b894;border-color:#57b894;color:#0f1512}
.nvs-theme-dark .nvs-seg button.on{background:#57b894;color:#0f1512}
.nvs-theme-dark .nvs-chip.on{background:#57b894;border-color:#57b894;color:#0f1512}
.nvs-theme-dark .nvs-badge.on{color:#4ade80;border-color:#4ade80}
`

    // ---------------------------------------------------------------------
    // Small presentational helpers
    // ---------------------------------------------------------------------
    function Icon({ size = 16, active = false }) {
      const brand = 'var(--dsw-alias-brand-primary,#2f6f5e)'
      const gold = '#f4b942'
      return h('svg', { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true, style: { display: 'block' } },
        h('path', { d: 'M15 20c6.5-2.2 11.2-2.2 17 0v27c-5.8-2.2-10.5-2.2-17 0z', fill: brand, opacity: active ? 1 : 0.9 }),
        h('path', { d: 'M49 20c-6.5-2.2-11.2-2.2-17 0v27c5.8-2.2 10.5-2.2 17 0z', fill: brand, opacity: active ? 0.75 : 0.55 }),
        h('path', { d: 'M45 11.5l7 7-19 19-8 2 2-8z', fill: gold, opacity: active ? 1 : 0.85 }),
      )
    }

    function Stat({ label, value }) {
      return h('div', { className: 'nvs-stat' }, h('span', null, label), h('b', null, value))
    }

    function Empty({ text }) {
      return h('div', { className: 'nvs-empty' }, text)
    }

    function PanelCard({ title, sub, right, children }) {
      return h('section', { className: 'nvs-panel-card' },
        title !== undefined || right !== undefined
          ? h('div', { className: 'nvs-card-head' },
              title !== undefined ? h('h3', null, title) : h('span', null),
              right ?? null,
            )
          : null,
        sub ? h('p', { className: 'nvs-card-sub' }, sub) : null,
        children,
      )
    }

    function Field({ label, hint, children }) {
      return h('div', { className: 'nvs-field' },
        h('div', { className: 'nvs-field-label' }, label, hint ? h('small', null, hint) : null),
        h('div', { className: 'nvs-field-control' }, children),
      )
    }

    function Stepper({ value, min, max, step = 1, onChange }) {
      const clampValue = (next) => Math.min(max, Math.max(min, Number.isFinite(next) ? next : min))
      return h('div', { className: 'nvs-step' },
        h('button', {
          type: 'button', 'aria-label': 'decrease', disabled: value <= min,
          onClick: () => onChange(clampValue(value - step)),
        }, '−'),
        h('input', {
          type: 'number', value, min, max, step,
          onChange: (event) => onChange(clampValue(Number(event.target.value))),
        }),
        h('button', {
          type: 'button', 'aria-label': 'increase', disabled: value >= max,
          onClick: () => onChange(clampValue(value + step)),
        }, '+'),
      )
    }

    function Segmented({ value, options, onChange }) {
      return h('div', { className: 'nvs-seg', role: 'group' }, options.map((option) => h('button', {
        key: option.value,
        type: 'button',
        className: value === option.value ? 'on' : '',
        onClick: () => onChange(option.value),
      }, option.label)))
    }

    // ---------------------------------------------------------------------
    // Charts (SVG)
    // ---------------------------------------------------------------------
    const CHART_W = 640
    const CHART_H = 300
    const PAD = 42

    function Axis({ y, width = CHART_W, height = CHART_H }) {
      return h('g', { stroke: 'var(--dsw-alias-border-l1,#e3e6ea)', strokeWidth: 1 },
        [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const yy = height - PAD - ratio * (height - PAD * 1.4)
          return h('line', { key: `g${ratio}`, x1: PAD, x2: width - 12, y1: yy, y2: yy, opacity: ratio === 0 ? 1 : 0.5 })
        }),
      )
    }

    function StoryChart({ data }) {
      const chapters = data.chapters
      if (chapters.length === 0) return h(Empty, { text: '还没有章节张力数据。' })
      const maxNo = chapters[chapters.length - 1].no
      const minNo = chapters[0].no
      const span = Math.max(1, maxNo - minNo)
      const x = (no) => PAD + ((no - minNo) / span) * (CHART_W - PAD - 18)
      const y = (value) => CHART_H - PAD - (value / 100) * (CHART_H - PAD * 1.4)
      const points = chapters.map((item) => `${x(item.no)},${y(item.tension)}`).join(' ')
      return h('svg', { viewBox: `0 0 ${CHART_W} ${CHART_H}`, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'story tension' },
        h(Axis, null),
        h('polyline', { points, fill: 'none', stroke: 'var(--dsw-alias-brand-primary,#2f6f5e)', strokeWidth: 2.4, strokeLinejoin: 'round' }),
        chapters.map((item) => h('g', { key: `c${item.no}` },
          h('circle', { cx: x(item.no), cy: y(item.tension), r: 4, fill: 'var(--dsw-alias-brand-primary,#2f6f5e)' },
            h('title', null, `第${item.no}章 ${item.title}｜张力 ${item.tension}｜钩子 ${item.hook}｜${item.emotion}｜${item.words}字`)),
          item.hook >= 70
            ? h('path', {
                d: `M${x(item.no)},${y(item.tension) + 12} l5,5 l-5,5 l-5,-5 z`,
                fill: 'var(--dsw-alias-state-warn-primary,#b45309)',
              }, h('title', null, `章末钩子 ${item.hook}`))
            : null,
        )),
        h('text', { x: PAD - 6, y: 16, fontSize: 10, fill: 'var(--dsw-alias-label-secondary,#5b6470)', textAnchor: 'start' }, '张力'),
        chapters.filter((_, index) => index % Math.max(1, Math.ceil(chapters.length / 8)) === 0).map((item) => h('text', {
          key: `l${item.no}`, x: x(item.no), y: CHART_H - 20, fontSize: 10,
          fill: 'var(--dsw-alias-label-secondary,#5b6470)', textAnchor: 'middle',
        }, `第${item.no}章`)),
      )
    }

    function RelationsChart({ data }) {
      const characters = data.characters
      if (characters.length === 0) return h(Empty, { text: '还没有人物数据。大纲生成后会自动出现。' })
      const degree = new Map()
      for (const relation of data.relations) {
        degree.set(relation.from, (degree.get(relation.from) ?? 0) + 1)
        degree.set(relation.to, (degree.get(relation.to) ?? 0) + 1)
      }
      const cx = CHART_W / 2
      const cy = CHART_H / 2 + 6
      const radius = Math.min(CHART_W, CHART_H) * 0.33
      const positions = new Map()
      characters.forEach((character, index) => {
        const angle = (Math.PI * 2 * index) / characters.length - Math.PI / 2
        positions.set(character.id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius })
      })
      const colorOf = (role) => (role === '主角' ? 'var(--dsw-alias-brand-primary,#2f6f5e)'
        : role === '反派' ? 'var(--dsw-alias-state-error-primary,#c0392b)'
        : role === '配角' ? 'var(--dsw-alias-state-warn-primary,#b45309)'
        : 'var(--dsw-alias-state-idle-primary,#8a94a0)')
      return h('svg', { viewBox: `0 0 ${CHART_W} ${CHART_H}`, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'character relations' },
        data.relations.map((relation, index) => {
          const from = positions.get(relation.from)
          const to = positions.get(relation.to)
          if (from === undefined || to === undefined) return null
          const opposing = /敌对|对立|仇|背叛|冲突/u.test(relation.label)
          return h('g', { key: `r${index}` },
            h('line', {
              x1: from.x, y1: from.y, x2: to.x, y2: to.y,
              stroke: opposing ? 'var(--dsw-alias-state-error-primary,#c0392b)' : 'var(--dsw-alias-border-l2,#c9ced6)',
              strokeWidth: Math.max(1, relation.strength),
              strokeDasharray: opposing ? '5 4' : undefined,
              opacity: 0.85,
            }, h('title', null, `${relation.label}（强度 ${relation.strength}）`)),
          )
        }),
        characters.map((character) => {
          const position = positions.get(character.id)
          const size = 12 + Math.min(10, (degree.get(character.id) ?? 0) * 2)
          return h('g', { key: character.id },
            h('circle', { cx: position.x, cy: position.y, r: size, fill: colorOf(character.role), opacity: 0.9 },
              h('title', null, `${character.name}｜${character.role}${character.group ? `｜${character.group}` : ''}`)),
            h('text', { x: position.x, y: position.y + size + 13, fontSize: 11, textAnchor: 'middle', fill: 'var(--dsw-alias-label-primary,#1f2328)' }, character.name),
          )
        }),
      )
    }

    function PacingChart({ data }) {
      const chapters = data.chapters
      if (chapters.length === 0) return h(Empty, { text: '还没有章节数据。' })
      const maxWords = Math.max(...chapters.map((item) => item.words), 1)
      const slot = (CHART_W - PAD - 18) / Math.max(1, chapters.length)
      const barWidth = Math.max(4, Math.min(26, slot * 0.56))
      const y = (value) => CHART_H - PAD - (value / 100) * (CHART_H - PAD * 1.4)
      const points = chapters.map((item, index) => `${PAD + slot * index + slot / 2},${y(item.hook)}`).join(' ')
      return h('svg', { viewBox: `0 0 ${CHART_W} ${CHART_H}`, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'pacing' },
        h(Axis, null),
        chapters.map((item, index) => {
          const x = PAD + slot * index + slot / 2 - barWidth / 2
          const barHeight = (item.words / maxWords) * (CHART_H - PAD * 1.4)
          return h('rect', {
            key: `b${item.no}`, x, y: CHART_H - PAD - barHeight, width: barWidth, height: barHeight,
            rx: 3, fill: 'var(--dsw-alias-brand-primary,#2f6f5e)', opacity: 0.35,
          }, h('title', null, `第${item.no}章｜${item.words}字｜钩子 ${item.hook}`))
        }),
        h('polyline', { points, fill: 'none', stroke: 'var(--dsw-alias-state-warn-primary,#b45309)', strokeWidth: 2 }),
        chapters.map((item, index) => h('circle', {
          key: `p${item.no}`, cx: PAD + slot * index + slot / 2, cy: y(item.hook), r: 3,
          fill: 'var(--dsw-alias-state-warn-primary,#b45309)',
        }, h('title', null, `钩子 ${item.hook}`))),
      )
    }

    function MetricsChart({ data, threshold = 70 }) {
      const metrics = data.metrics
      if (metrics.length === 0) return h(Empty, { text: '还没有审校记录。跑完一轮审稿后会出现。' })
      const slot = (CHART_W - PAD - 18) / Math.max(1, metrics.length - 1)
      const x = (index) => PAD + slot * index
      const y = (value) => CHART_H - PAD - (value / 100) * (CHART_H - PAD * 1.4)
      const aiPoints = metrics.map((item, index) => `${x(index)},${y(item.aiScore)}`).join(' ')
      const readPoints = metrics.map((item, index) => `${x(index)},${y(item.readability)}`).join(' ')
      const thresholdY = y(threshold)
      return h('svg', { viewBox: `0 0 ${CHART_W} ${CHART_H}`, style: { width: '100%', height: 'auto' }, role: 'img', 'aria-label': 'review metrics' },
        h(Axis, null),
        h('line', { x1: PAD, x2: CHART_W - 12, y1: thresholdY, y2: thresholdY, stroke: 'var(--dsw-alias-state-error-primary,#c0392b)', strokeDasharray: '6 4', opacity: 0.6 }),
        h('polyline', { points: aiPoints, fill: 'none', stroke: 'var(--dsw-alias-brand-primary,#2f6f5e)', strokeWidth: 2.4 }),
        h('polyline', { points: readPoints, fill: 'none', stroke: 'var(--dsw-alias-state-idle-primary,#8a94a0)', strokeWidth: 2, strokeDasharray: '6 4' }),
        metrics.map((item, index) => h('g', { key: `m${index}` },
          h('circle', { cx: x(index), cy: y(item.aiScore), r: 4, fill: 'var(--dsw-alias-brand-primary,#2f6f5e)' }, h('title', null, `第${item.round}轮 AI 味 ${item.aiScore}`)),
          h('circle', { cx: x(index), cy: y(item.readability), r: 3.5, fill: 'var(--dsw-alias-state-idle-primary,#8a94a0)' }, h('title', null, `第${item.round}轮 可读性 ${item.readability}`)),
        )),
      )
    }

    function ChartBody({ tab, data, threshold }) {
      if (tab === 'story') return h(StoryChart, { data })
      if (tab === 'relations') return h(RelationsChart, { data })
      if (tab === 'pacing') return h(PacingChart, { data })
      return h(MetricsChart, { data, threshold })
    }

    const TAB_META = {
      story: { titleKey: 'storyTitle', hintKey: 'storyHint' },
      relations: { titleKey: 'relationsTitle', hintKey: 'relationsHint' },
      pacing: { titleKey: 'pacingTitle', hintKey: 'pacingHint' },
      metrics: { titleKey: 'metricsTitle', hintKey: 'metricsHint' },
    }

    // ---------------------------------------------------------------------
    // Overlay modal
    // ---------------------------------------------------------------------
    function Overlay({ t, locale }) {
      const state = useStore()
      const [charts, setCharts] = useState(null)
      const [status, setStatus] = useState('idle')
      const [error, setError] = useState('')
      const [threshold, setThreshold] = useState(70)
      const [panelTheme, setPanelTheme] = useState('auto')
      const lastVersion = useRef(null)
      const lastOutputVersion = useRef(null)

      const load = useCallback(async () => {
        try {
          setStatus('loading')
          const payload = await getJson('/novel-studio/charts')
          setCharts(payload.data ?? null)
          setStatus('ready')
          setError('')
        } catch (cause) {
          setStatus('error')
          setError(String(cause?.message ?? cause))
        }
      }, [])

      useEffect(() => {
        if (!state.open) return
        load()
      }, [state.open, load])

      const moveBy = (step) => {
        const total = viewCount(store.state.view)
        const current = positionOf(store.state)
        const next = (current + step + total) % total
        if (next === 4) store.set({ view: 'help' })
        else store.set({ view: 'charts', tab: CHART_TABS[next] })
      }

      useEffect(() => {
        const onKey = (event) => {
          if (!store.state.open) return
          if (event.key === 'Escape') store.set({ open: false })
          if (event.key === 'ArrowLeft') moveBy(-1)
          if (event.key === 'ArrowRight') moveBy(1)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      // Poll plugin state: auto-open help once, auto-open charts on new data.
      useEffect(() => {
        let alive = true
        const tick = async () => {
          if (document.visibilityState !== 'visible') return
          try {
            const payload = await getJson('/novel-studio/state')
            if (!alive) return
            const version = Number(payload.chartVersion ?? 0)
            const settings = payload.settings ?? {}
            if (Number.isFinite(settings.scanThreshold)) setThreshold(settings.scanThreshold)
            if (settings.panelTheme === 'light' || settings.panelTheme === 'dark' || settings.panelTheme === 'auto') {
              setPanelTheme(settings.panelTheme)
              if (store.state.panelTheme !== settings.panelTheme) store.set({ panelTheme: settings.panelTheme })
            } else if (store.state.panelTheme === undefined) {
              store.set({ panelTheme: 'auto' })
            }
            if (lastVersion.current === null) {
              lastVersion.current = version
            } else if (version > lastVersion.current && settings.autoChart !== false) {
              lastVersion.current = version
              showStudioView('charts')
            } else if (version > lastVersion.current) {
              lastVersion.current = version
            }

            const outputVersion = Number(payload.project?.outputVersion ?? 0)
            if (lastOutputVersion.current === null) {
              lastOutputVersion.current = outputVersion
            } else if (outputVersion > lastOutputVersion.current) {
              lastOutputVersion.current = outputVersion
              const mode = settings.outputMode === 'chat' || payload.project?.outputMode === 'chat' ? 'chat' : 'file'
              if (settings.autoPopup !== false && mode === 'file') showStudioView('text')
            }
          } catch {
            // The web server may still be starting; retry on the next tick.
          }
        }
        tick()
        const timer = setInterval(tick, 4000)
        return () => { alive = false; clearInterval(timer) }
      }, [])

      const tabs = useMemo(() => VIEWS.map((view) => ({
        id: view,
        label: view === 'charts' ? t('overlayChartTab') : t('overlayHelpTab'),
      })), [t])

      const total = viewCount(state.view)
      const index = positionOf(state)

      if (!state.open) return null

      const chartTab = state.view === 'help' ? null : (state.tab ?? 'story')
      const data = charts ?? { chapters: [], characters: [], relations: [], metrics: [], summary: '' }

      return h('div', {
        className: `nvs-overlay ${panelThemeClass(panelTheme)}`.trim(),
        onClick: () => store.set({ open: false }),
      },
        h('div', { className: 'nvs-card', onClick: (event) => event.stopPropagation(), role: 'dialog', 'aria-label': t('panelTitle') },
          h('div', { className: 'nvs-head' },
            h(Icon, { size: 18, active: true }),
            h('div', { className: 'nvs-title' }, t('panelTitle')),
            h('button', { className: 'nvs-close', onClick: () => store.set({ open: false }), 'aria-label': t('close') }, '×'),
          ),
          h('div', { className: 'nvs-tabs' },
            tabs.map((tab) => h('button', {
              key: tab.id, className: `nvs-tab${state.view === tab.id ? ' on' : ''}`,
              onClick: () => store.set({ view: tab.id }),
            }, tab.label)),
          ),
          h('div', { className: 'nvs-switch' },
            h('button', { className: 'nvs-switch-btn', onClick: () => moveBy(-1) }, `‹ ${t('prev')}`),
            h('button', { className: 'nvs-switch-btn', onClick: () => moveBy(1) }, `${t('next')} ›`),
            h('span', { className: 'nvs-counter' }, `${index + 1}/${total}`),
            state.view === 'charts'
              ? h('button', { className: 'nvs-switch-btn', onClick: () => load(), disabled: status === 'loading' }, t('reload'))
              : null,
          ),
          h('div', { className: 'nvs-body' },
            error ? h('div', { className: 'nvs-warn' }, `${t('loadFailed')} (${error})`) : null,
            state.view === 'charts'
              ? h('div', null,
                  chartTab === 'story' || chartTab === 'relations' || chartTab === 'pacing' || chartTab === 'metrics'
                    ? h('div', null,
                        h('div', { className: 'nvs-h3' }, t(TAB_META[chartTab].titleKey)),
                        h('p', { className: 'nvs-hint' }, t(TAB_META[chartTab].hintKey)),
                        status === 'loading' && charts === null
                          ? h(Empty, { text: t('loading') })
                          : h(ChartBody, { tab: chartTab, data, threshold }),
                        chartTab === 'story' && data.summary
                          ? h('p', { className: 'nvs-hint', style: { marginTop: 10 } }, `${t('chartSummary')}：${data.summary}`)
                          : null,
                        chartTab === 'relations'
                          ? h('div', { className: 'nvs-legend' },
                              h('span', null, h('i', { className: 'nvs-dot', style: { background: 'var(--dsw-alias-brand-primary,#2f6f5e)' } }), '主角'),
                              h('span', null, h('i', { className: 'nvs-dot', style: { background: 'var(--dsw-alias-state-error-primary,#c0392b)' } }), '反派'),
                              h('span', null, h('i', { className: 'nvs-dot', style: { background: 'var(--dsw-alias-state-warn-primary,#b45309)' } }), '配角'),
                              h('span', null, '实线=关系，虚线=对立'),
                            )
                          : null,
                      )
                    : h(Empty, { text: t('emptyChart') }),
                  h('div', { className: 'nvs-legend' }, CHART_TABS.map((id, idx) => h('span', { key: id },
                    `${idx + 1}. ${t(TAB_META[id].titleKey)}`,
                  ))),
                )
              : h(HelpView, { t, locale }),
          ),
        ),
      )
    }

    function viewCount(view) {
      return VIEWS.length + CHART_TABS.length - 1
    }

    function positionOf(state) {
      if (state.view === 'help') return 4
      const idx = CHART_TABS.indexOf(state.tab ?? 'story')
      return idx < 0 ? 0 : idx
    }

    // ---------------------------------------------------------------------
    // Help
    // ---------------------------------------------------------------------
    function HelpView({ t, locale }) {
      const sections = helpSections(locale)
      return h('div', { className: 'nvs-help' },
        h('div', { className: 'nvs-h3' }, t('overlayHelpTab')),
        h('p', { className: 'nvs-hint' }, t('helpIntro')),
        sections.map((section) => h('div', { key: section.title },
          h('h4', null, section.title),
          h('ul', { className: 'nvs-list' }, section.items.map((item, index) => h('li', { key: index }, item))),
        )),
      )
    }

    // ---------------------------------------------------------------------
    // TXT preview overlay
    // ---------------------------------------------------------------------
    function TextOverlay({ t }) {
      const state = useStore()
      const [data, setData] = useState(null)
      const [error, setError] = useState('')
      const [loading, setLoading] = useState(false)
      const [copied, setCopied] = useState(false)
      const [size, setSize] = useState('m')
      const FONT = { s: '12.5px', m: '14px', l: '16px' }

      useEffect(() => {
        if (!state.textOpen) return
        let alive = true
        setLoading(true)
        setError('')
        getJson('/novel-studio/output')
          .then((payload) => { if (alive) setData(payload) })
          .catch((cause) => { if (alive) setError(String(cause?.message ?? cause)) })
          .finally(() => { if (alive) setLoading(false) })
        return () => { alive = false }
      }, [state.textOpen])

      if (!state.textOpen) return null
      const text = typeof data?.text === 'string' ? data.text : ''
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // clipboard may be blocked; the text stays selectable
        }
      }
      const sizeButton = (key, label, title) => h('button', {
        className: `nvs-btn${size === key ? ' primary' : ''}`,
        style: { padding: '3px 8px', minWidth: 30 },
        onClick: () => setSize(key),
        title,
      }, label)

      return h('div', {
        className: `nvs-overlay ${panelThemeClass(state.panelTheme)}`.trim(),
        onClick: () => store.set({ textOpen: false }),
      },
        h('div', {
          className: 'nvs-card',
          style: { width: 'min(900px,95vw)' },
          onClick: (event) => event.stopPropagation(),
          role: 'dialog',
          'aria-label': t('textTitle'),
        },
          h('div', { className: 'nvs-head' },
            h(Icon, { size: 18, active: true }),
            h('div', { className: 'nvs-title' }, data?.name ? `${t('textTitle')} · ${data.name}` : t('textTitle')),
            h('button', { className: 'nvs-close', onClick: () => store.set({ textOpen: false }), 'aria-label': t('textClose') }, '×'),
          ),
          h('div', { className: 'nvs-body' },
            error ? h('div', { className: 'nvs-error' }, h('span', null, error)) : null,
            text.length === 0
              ? h(Empty, { text: loading ? t('loading') : t('textEmpty') })
              : h('div', null,
                  h('div', { className: 'nvs-meta' },
                    data?.path ? h('span', null, data.path) : null,
                    Number.isFinite(data?.chars) ? h('span', null, `${data.chars} 字`) : null,
                    data?.truncated ? h('span', null, '（预览截断）') : null,
                    h('span', { style: { marginLeft: 'auto', display: 'inline-flex', gap: 4, alignItems: 'center' } },
                      sizeButton('s', 'A-', '小'),
                      sizeButton('m', 'A', '中'),
                      sizeButton('l', 'A+', '大'),
                    ),
                  ),
                  h('pre', { className: 'nvs-pre', style: { fontSize: FONT[size] } }, text),
                  h('div', { className: 'nvs-actions', style: { marginBottom: 0 } },
                    h('button', { className: 'nvs-primary', onClick: copy }, copied ? t('copied') : t('copy')),
                    h('button', { className: 'nvs-btn', onClick: () => store.set({ textOpen: false }) }, t('textClose')),
                  ),
                ),
          ),
        ),
      )
    }

    // ---------------------------------------------------------------------
    // Right sidebar panel (primary surface) and its sub-views
    // ---------------------------------------------------------------------
    let rightbarController = null
    const RIGHT_PANEL_ID = 'novel-studio-panel'

    /** Open the studio panel in the host right sidebar; false when it is unavailable. */
    function openRightbarTab(view) {
      if (rightbarController === null || typeof rightbarController.openTab !== 'function') return false
      try {
        rightbarController.openTab(RIGHT_PANEL_ID)
        store.set({ rightView: view ?? 'charts', open: false, textOpen: false })
        return true
      } catch {
        return false
      }
    }

    function showStudioView(view) {
      if (!openRightbarTab(view)) store.set({ open: true, view: view === 'hooks' ? 'charts' : view })
    }

    function HooksView({ t, hooks }) {
      if (!Array.isArray(hooks) || hooks.length === 0) return h(Empty, { text: t('hooksEmpty') })
      const open = hooks.filter((hook) => hook.status !== 'resolved')
      const resolved = hooks.filter((hook) => hook.status === 'resolved')
      const row = (hook) => h('div', { className: 'nvs-hook', key: hook.id },
        h('div', { className: 'nvs-hook-head' },
          h('span', { className: 'nvs-hook-ch' }, hook.chapter ? `第 ${hook.chapter} 章` : '—'),
          h('span', { className: `nvs-chip${hook.status === 'resolved' ? '' : ' on'}`, style: { cursor: 'default', fontSize: 11 } }, hook.type ?? '悬念'),
          h('span', { className: 'nvs-hook-title' }, hook.title ?? ''),
          h('span', {
            className: `nvs-badge${hook.status === 'resolved' ? '' : ' on'}`,
            style: { fontSize: 10.5 },
          }, hook.status === 'resolved' ? t('hookResolved') : t('hookOpen')),
        ),
        h('p', { className: 'nvs-hook-text' }, hook.text ?? ''),
      )
      return h('div', null,
        h('p', { className: 'nvs-hint' }, `${t('hooksOpen')} ${open.length} / ${hooks.length}`),
        open.length > 0 ? h('div', null,
          h('div', { className: 'nvs-role-group-title' }, `${t('hookOpen')} · ${open.length}`),
          open.map(row),
        ) : null,
        resolved.length > 0 ? h('div', null,
          h('div', { className: 'nvs-role-group-title' }, `${t('hookResolved')} · ${resolved.length}`),
          resolved.map(row),
        ) : null,
      )
    }

    function RightPanel({ t, locale }) {
      const ui = useStore()
      const view = ui.rightView ?? 'charts'
      const [charts, setCharts] = useState(null)
      const [hooks, setHooks] = useState([])
      const [textData, setTextData] = useState(null)
      const [panelTheme, setPanelTheme] = useState('auto')
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState('')
      const [chartTab, setChartTab] = useState('story')
      const [size, setSize] = useState('m')
      const [copied, setCopied] = useState(false)
      const [settingsForm, setSettingsForm] = useState(null)
      const [settingsSaved, setSettingsSaved] = useState(false)
      const [settingsBusy, setSettingsBusy] = useState(false)
      const [styleMemory, setStyleMemory] = useState(null)
      const [styleDraft, setStyleDraft] = useState('')
      const [styleChapter, setStyleChapter] = useState('')
      const [styleBusy, setStyleBusy] = useState(false)
      const [styleMessage, setStyleMessage] = useState('')
      const [styleConfirmClear, setStyleConfirmClear] = useState(false)
      const FONT = { s: '12.5px', m: '14px', l: '16px' }

      const loadAll = useCallback(async () => {
        setLoading(true)
        try {
          const [statePayload, chartsPayload, hooksPayload, outputPayload, stylePayload] = await Promise.all([
            getJson('/novel-studio/state').catch(() => null),
            getJson('/novel-studio/charts').catch(() => null),
            getJson('/novel-studio/hooks').catch(() => null),
            getJson('/novel-studio/output').catch(() => null),
            getJson('/novel-studio/style').catch(() => null),
          ])
          if (statePayload?.settings?.panelTheme) setPanelTheme(statePayload.settings.panelTheme)
          if (statePayload?.settings) {
            setSettingsForm((previous) => previous ?? statePayload.settings)
          }
          if (stylePayload) setStyleMemory(stylePayload.memory ?? null)
          if (chartsPayload) setCharts(chartsPayload.data ?? null)
          if (hooksPayload) setHooks(Array.isArray(hooksPayload.hooks) ? hooksPayload.hooks : [])
          if (outputPayload) setTextData(outputPayload)
          setError('')
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setLoading(false)
        }
      }, [])

      const saveSettings = async () => {
        if (settingsForm === null) return
        setSettingsBusy(true)
        try {
          const payload = await postJson('/novel-studio/settings', settingsForm)
          setSettingsForm(payload.settings ?? settingsForm)
          setSettingsSaved(true)
          setTimeout(() => setSettingsSaved(false), 1600)
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setSettingsBusy(false)
        }
      }

      useEffect(() => {
        loadAll()
        const timer = setInterval(loadAll, 8000)
        return () => clearInterval(timer)
      }, [loadAll])

      const learnStyle = async () => {
        if (styleDraft.trim().length < 100) {
          setStyleMessage('改稿至少 100 字，先粘贴完整内容再学习。')
          return
        }
        setStyleBusy(true)
        setStyleMessage('')
        try {
          const body = { revised: styleDraft }
          const chapter = Number.parseInt(styleChapter, 10)
          if (Number.isFinite(chapter) && chapter > 0) body.chapter = chapter
          const payload = await postJson('/novel-studio/learn', body)
          if (payload.duplicate) {
            setStyleMessage('这篇改稿之前学习过，没有重复记录。')
          } else if (payload.unchanged) {
            setStyleMessage('改稿与原稿完全相同，没有检测到修改。')
          } else {
            const traits = Array.isArray(payload.traits) ? payload.traits : []
            setStyleMessage(`已学习：${payload.stats?.changes ?? 0} 处修改，新增 ${traits.length} 条偏好。`)
            setStyleDraft('')
          }
          await loadAll()
        } catch (cause) {
          setStyleMessage(String(cause?.message ?? cause))
        } finally {
          setStyleBusy(false)
        }
      }

      const clearStyle = async () => {
        if (!styleConfirmClear) {
          setStyleConfirmClear(true)
          return
        }
        setStyleBusy(true)
        try {
          await postJson('/novel-studio/style', { clear: true })
          setStyleConfirmClear(false)
          setStyleMessage('作者风格记忆已清空。')
          await loadAll()
        } catch (cause) {
          setStyleMessage(String(cause?.message ?? cause))
        } finally {
          setStyleBusy(false)
        }
      }

      const toggleStyle = async (enabled) => {
        setStyleBusy(true)
        try {
          await postJson('/novel-studio/style', { enabled })
          await loadAll()
        } catch (cause) {
          setStyleMessage(String(cause?.message ?? cause))
        } finally {
          setStyleBusy(false)
        }
      }

      const data = charts ?? { chapters: [], characters: [], relations: [], metrics: [], summary: '' }
      const text = typeof textData?.text === 'string' ? textData.text : ''
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // clipboard may be blocked
        }
      }
      const tabs = [
        { id: 'charts', label: t('rightCharts') },
        { id: 'hooks', label: t('rightHooks') },
        { id: 'text', label: t('rightText') },
        { id: 'style', label: t('rightStyle') },
        { id: 'settings', label: t('rightSettings') },
        { id: 'help', label: t('rightHelp') },
      ]
      const sizeButton = (key, label, title) => h('button', {
        className: `nvs-btn${size === key ? ' primary' : ''}`,
        style: { padding: '3px 8px', minWidth: 30 },
        onClick: () => setSize(key),
        title,
      }, label)

      return h('div', { className: `nvs-right ${panelThemeClass(panelTheme)}`.trim() },
        h('div', { className: 'nvs-right-head' },
          h(Icon, { size: 18, active: true }),
          h('div', { className: 'nvs-right-title' }, t('panelTitle')),
          h('button', { className: 'nvs-btn', onClick: loadAll, disabled: loading }, `↻ ${t('refresh')}`),
        ),
        h('div', { className: 'nvs-tabs', style: { padding: '8px 10px 0' } },
          tabs.map((tab) => h('button', {
            key: tab.id,
            className: `nvs-tab${view === tab.id ? ' on' : ''}`,
            onClick: () => store.set({ rightView: tab.id }),
          }, tab.label)),
        ),
        h('div', { className: 'nvs-right-body' },
          error ? h('div', { className: 'nvs-error' }, h('span', null, error)) : null,
          view === 'charts' ? h('div', null,
            h('div', { className: 'nvs-actions', style: { margin: '0 0 4px' } },
              h('button', { className: 'nvs-btn', onClick: () => setChartTab((prev) => prev === 'story' ? 'metrics' : prev === 'metrics' ? 'pacing' : prev === 'pacing' ? 'relations' : 'story') }, '‹'),
              h('span', { className: 'nvs-note', style: { minWidth: 90, textAlign: 'center' } }, t(TAB_META[chartTab].titleKey)),
              h('button', { className: 'nvs-btn', onClick: () => setChartTab((prev) => prev === 'story' ? 'relations' : prev === 'relations' ? 'pacing' : prev === 'pacing' ? 'metrics' : 'story') }, '›'),
            ),
            h('p', { className: 'nvs-hint' }, t(TAB_META[chartTab].hintKey)),
            h(ChartBody, { tab: chartTab, data, threshold: 70 }),
            data.summary ? h('p', { className: 'nvs-hint', style: { marginTop: 8 } }, `${t('chartSummary')}：${data.summary}`) : null,
            h('div', { className: 'nvs-legend' }, CHART_TABS.map((id, idx) => h('span', { key: id },
              `${idx + 1}. ${t(TAB_META[id].titleKey)}`,
            ))),
          ) : null,
          view === 'hooks' ? h(HooksView, { t, hooks }) : null,
          view === 'text' ? h('div', null,
            text.length === 0
              ? h(Empty, { text: loading ? t('loading') : t('textEmpty') })
              : h('div', null,
                  h('div', { className: 'nvs-meta' },
                    textData?.name ? h('span', null, textData.name) : null,
                    Number.isFinite(textData?.chars) ? h('span', null, `${textData.chars} 字`) : null,
                    h('span', { style: { marginLeft: 'auto', display: 'inline-flex', gap: 4, alignItems: 'center' } },
                      sizeButton('s', 'A-', '小'),
                      sizeButton('m', 'A', '中'),
                      sizeButton('l', 'A+', '大'),
                    ),
                  ),
                  h('pre', { className: 'nvs-pre', style: { fontSize: FONT[size] } }, text),
                  h('div', { className: 'nvs-actions', style: { marginBottom: 0 } },
                    h('button', { className: 'nvs-btn', onClick: copy }, copied ? t('copied') : t('copy')),
                  ),
                ),
          ) : null,
          view === 'style' ? h('div', null,
            styleMemory === null
              ? h(Empty, { text: t('loading') })
              : h('div', null,
                  h('div', { className: 'nvs-meta' },
                    h('span', null, `${(styleMemory.traits ?? []).length} 条偏好 · ${(styleMemory.samples ?? []).length} 个样本 · ${(styleMemory.vocab ?? []).length} 对替换`),
                    h('button', {
                      className: 'nvs-btn', style: { marginLeft: 'auto' },
                      onClick: () => toggleStyle(!(styleMemory.enabled !== false)),
                      disabled: styleBusy,
                    }, styleMemory.enabled !== false ? t('on') : t('off')),
                  ),
                  (styleMemory.traits ?? []).length === 0
                    ? h(Empty, { text: t('styleEmpty') })
                    : h('div', null, (styleMemory.traits ?? []).map((trait) => h('div', { className: 'nvs-hook', key: trait.id ?? trait.text },
                        h('p', { className: 'nvs-hook-text' }, trait.text),
                        h('span', { className: 'nvs-hint' }, `命中 ${trait.hits ?? 1} 次`),
                      ))),
                  h('div', { className: 'nvs-role-group-title', style: { marginTop: 12 } }, t('learnStyle')),
                  h('textarea', {
                    className: 'nvs-search', rows: 6,
                    style: { width: '100%', margin: '0 0 6px', fontFamily: 'inherit', resize: 'vertical' },
                    placeholder: t('stylePlaceholder'),
                    value: styleDraft,
                    onChange: (event) => setStyleDraft(event.target.value),
                  }),
                  h('div', { className: 'nvs-actions', style: { margin: '0 0 6px' } },
                    h('input', {
                      className: 'nvs-search', type: 'text', style: { margin: 0, maxWidth: 90 },
                      placeholder: t('chapterNo'), value: styleChapter,
                      onChange: (event) => setStyleChapter(event.target.value.replace(/[^\d]/g, '')),
                    }),
                    h('button', { className: 'nvs-primary', onClick: learnStyle, disabled: styleBusy }, styleBusy ? t('loading') : t('learnButton')),
                    h('button', { className: 'nvs-btn', onClick: clearStyle, disabled: styleBusy }, styleConfirmClear ? t('confirmClear') : t('clearStyle')),
                  ),
                  styleMessage ? h('p', { className: 'nvs-hint' }, styleMessage) : null,
                  h('p', { className: 'nvs-hint' }, '原稿会自动从最近输出或版本备份中查找；找不到时，请在对话里把原稿一起发给模型。'),
                ),
          ) : null,
          view === 'settings' ? h('div', null,
            settingsForm === null
              ? h(Empty, { text: t('loading') })
              : h('div', null,
                  h(Field, { label: t('rounds'), hint: t('roundsHint') },
                    h(Stepper, {
                      value: settingsForm.rounds ?? 2, min: 0, max: 4,
                      onChange: (value) => setSettingsForm({ ...settingsForm, rounds: value }),
                    }),
                  ),
                  h(Field, { label: t('chapterWords'), hint: t('wordsHint') },
                    h(Stepper, {
                      value: settingsForm.chapterWords ?? 2500, min: 800, max: 8000, step: 100,
                      onChange: (value) => setSettingsForm({ ...settingsForm, chapterWords: value }),
                    }),
                  ),
                  h(Field, { label: t('threshold'), hint: t('thresholdHint') },
                    h(Stepper, {
                      value: settingsForm.scanThreshold ?? 70, min: 50, max: 95,
                      onChange: (value) => setSettingsForm({ ...settingsForm, scanThreshold: value }),
                    }),
                  ),
                  h(Field, { label: t('twist'), hint: t('twistHint') },
                    h(Stepper, {
                      value: settingsForm.twist ?? 30, min: 0, max: 100,
                      onChange: (value) => setSettingsForm({ ...settingsForm, twist: value }),
                    }),
                  ),
                  h(Field, { label: '平台' },
                    h('input', {
                      className: 'nvs-search', type: 'text', value: settingsForm.platform ?? '',
                      style: { margin: 0 },
                      placeholder: '番茄',
                      onChange: (event) => setSettingsForm({ ...settingsForm, platform: event.target.value }),
                    }),
                  ),
                  h(Field, { label: t('outputMode') },
                    h(Segmented, {
                      value: settingsForm.outputMode ?? 'file',
                      options: [
                        { value: 'file', label: t('outputModeFile') },
                        { value: 'chat', label: t('outputModeChat') },
                      ],
                      onChange: (value) => setSettingsForm({ ...settingsForm, outputMode: value }),
                    }),
                  ),
                  h(Field, { label: t('autoPopup') },
                    h('label', { className: 'nvs-check' },
                      h('input', {
                        type: 'checkbox', checked: settingsForm.autoPopup !== false,
                        onChange: (event) => setSettingsForm({ ...settingsForm, autoPopup: event.target.checked }),
                      }),
                      settingsForm.autoPopup !== false ? t('on') : t('off'),
                    ),
                  ),
                  h(Field, { label: t('panelTheme') },
                    h(Segmented, {
                      value: settingsForm.panelTheme ?? 'auto',
                      options: [
                        { value: 'auto', label: t('themeAuto') },
                        { value: 'light', label: t('themeLight') },
                        { value: 'dark', label: t('themeDark') },
                      ],
                      onChange: (value) => setSettingsForm({ ...settingsForm, panelTheme: value }),
                    }),
                  ),
                  h('div', { className: 'nvs-actions', style: { marginBottom: 0 } },
                    h('button', { className: 'nvs-primary', onClick: saveSettings, disabled: settingsBusy }, t('save')),
                    settingsSaved ? h('span', { className: 'nvs-toast' }, `✓ ${t('saved')}`) : null,
                  ),
                  h('p', { className: 'nvs-hint', style: { marginTop: 8 } }, '审稿角色请在侧边栏「小说创作」主面板勾选。'),
                ),
          ) : null,
          view === 'help' ? h(HelpView, { t, locale }) : null,
        ),
      )
    }

    // ---------------------------------------------------------------------
    // Guide card (right sidebar, best-effort seat)
    // ---------------------------------------------------------------------
    function GuideCard({ t }) {
      const ui = useStore()
      return h('div', {
        className: panelThemeClass(ui.panelTheme),
        style: { padding: '10px 12px', fontSize: 12.5, lineHeight: 1.7 },
      },
        h('div', { style: { fontWeight: 600, marginBottom: 4 } }, t('guideTitle')),
        h('p', { style: { margin: '0 0 8px', color: 'var(--dsw-alias-label-secondary,#5b6470)' } }, t('guideBody')),
        h('button', {
          className: 'nvs-btn',
          onClick: () => showStudioView('help'),
        }, t('guideOpen')),
      )
    }

    // ---------------------------------------------------------------------
    // Main workbench panel
    // ---------------------------------------------------------------------
    function StudioPanel({ t, locale }) {
      const [state, setState] = useState(null)
      const [error, setError] = useState('')
      const [busy, setBusy] = useState(false)
      const [saved, setSaved] = useState(false)
      const [pendingDelete, setPendingDelete] = useState('')
      const [createForm, setCreateForm] = useState({
        title: '',
        platform: '番茄',
        genre: '',
        tone: '',
        length: '长篇连载',
        chapterWords: 2500,
        twist: 30,
      })
      const [createBusy, setCreateBusy] = useState(false)
      const [createMessage, setCreateMessage] = useState('')
      const [roles, setRoles] = useState([])
      const [showRoles, setShowRoles] = useState(false)
      const [roleQuery, setRoleQuery] = useState('')
      const formLoaded = useRef(false)
      const [form, setForm] = useState({
        rounds: 2,
        chapterWords: 2500,
        scanThreshold: 70,
        autoChart: true,
        autoHelp: false,
        outputMode: 'file',
        autoPopup: true,
        outputDir: '',
        selectedRoles: [],
        panelTheme: 'auto',
        twist: 30,
        platform: '',
      })

      const refresh = useCallback(async () => {
        try {
          const payload = await getJson('/novel-studio/state')
          setState(payload)
          setError('')
          if (payload.settings && !formLoaded.current) {
            formLoaded.current = true
            setForm(payload.settings)
          }
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        }
      }, [])

      useEffect(() => {
        refresh()
        const timer = setInterval(refresh, 6000)
        return () => clearInterval(timer)
      }, [refresh])

      useEffect(() => {
        let alive = true
        getJson('/novel-studio/roles')
          .then((payload) => {
            if (alive) setRoles(Array.isArray(payload.roles) ? payload.roles : [])
          })
          .catch(() => {
            // older host: the reviewer picker stays hidden
          })
        return () => { alive = false }
      }, [])

      const enable = async () => {
        setBusy(true)
        try {
          await postJson('/novel-studio/activate', {})
          await refresh()
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }

      const save = async () => {
        setBusy(true)
        try {
          const payload = await postJson('/novel-studio/settings', form)
          setForm(payload.settings ?? form)
          setSaved(true)
          setTimeout(() => setSaved(false), 1600)
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }

      const removeProject = async (slug) => {
        setBusy(true)
        try {
          await postJson('/novel-studio/discard', { slug, confirm: true })
          setPendingDelete('')
          await refresh()
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }

      const createProject = async () => {
        if (createForm.title.trim().length === 0) {
          setCreateMessage('先给新书起个名字。')
          return
        }
        setCreateBusy(true)
        setCreateMessage('')
        try {
          const payload = await postJson('/novel-studio/create', createForm)
          const title = payload.project?.title ?? createForm.title
          setCreateMessage(`已创建《${title}》。回到对话说「继续写《${title}》」即可开始。`)
          setCreateForm((previous) => ({ ...previous, title: '', genre: '', tone: '' }))
          await refresh()
        } catch (cause) {
          setCreateMessage(String(cause?.message ?? cause))
        } finally {
          setCreateBusy(false)
        }
      }

      const project = state?.project ?? null
      const projects = Array.isArray(state?.projects) ? state.projects : []
      const selectedRoles = Array.isArray(form.selectedRoles) ? form.selectedRoles : []
      const toggleRole = (id) => {
        const next = selectedRoles.includes(id)
          ? selectedRoles.filter((item) => item !== id)
          : [...selectedRoles, id]
        setForm({ ...form, selectedRoles: next })
      }
      const roleGroups = [
        { key: 'platform', label: t('roleGroupPlatform'), items: roles.filter((role) => role.group === 'platform') },
        { key: 'business', label: t('roleGroupBusiness'), items: roles.filter((role) => role.group === 'business') },
        { key: 'craft', label: t('roleGroupCraft'), items: roles.filter((role) => role.group === 'craft') },
      ]
      const matchesQuery = (role) => {
        const query = String(roleQuery ?? '').trim().toLowerCase()
        if (query.length === 0) return true
        return `${role.name} ${role.duty}`.toLowerCase().includes(query)
      }

      return h('div', {
        className: `nvs-panel ${panelThemeClass(form.panelTheme)}`.trim(),
        style: { height: '100%', minHeight: 0, overflowY: 'auto' },
      },
        h('div', { className: 'nvs-hero' },
          h('button', { className: 'nvs-btn nvs-hero-refresh', onClick: refresh }, `↻ ${t('refresh')}`),
          h('div', { className: 'nvs-hero-icon' }, h(Icon, { size: 28, active: true })),
          h('h2', null, t('panelTitle')),
          h('p', null, t('panelSubtitle')),
          h('div', { className: 'nvs-hero-side' },
            h('span', { className: `nvs-badge ${project ? 'on' : 'off'}` }, project ? `● ${t('badgeReady')}` : `○ ${t('badgeIdle')}`),
          ),
        ),
        error
          ? h('div', { className: 'nvs-error' },
              h('span', null, `${t('loadFailed')} ${error}`),
              h('button', { onClick: () => setError(''), 'aria-label': t('close') }, '×'),
            )
          : null,
        h(PanelCard, {
          title: project ? `${t('project')} · ${project.title}` : t('project'),
          sub: project ? null : `${t('notEnabled')} ${t('triggerHint')}`,
          right: project ? h('span', { className: 'nvs-badge on' }, project.stage) : null,
        },
          project
            ? h('div', null,
                h('div', { className: 'nvs-stat-grid' },
                  h(Stat, { label: t('stage'), value: project.stage }),
                  h(Stat, { label: t('chapters'), value: String(project.chapters ?? 0) }),
                  h(Stat, { label: t('chapterWords'), value: String(project.chapterWords ?? 2500) }),
                  h(Stat, { label: t('rounds'), value: String(project.rounds ?? 2) }),
                  h(Stat, { label: t('rightHooks'), value: `${project.hooksOpen ?? 0}/${project.hooksTotal ?? 0}` }),
                  h(Stat, { label: t('twist'), value: String(project.twist ?? 30) }),
                  h(Stat, { label: '平台', value: project.platform || '未指定' }),
                  h(Stat, { label: '风向', value: `${(project.platformGuidance ?? []).length} 条` }),
                ),
                state?.lastOutput
                  ? h('div', { className: 'nvs-kv' },
                      h('span', null, `${t('lastOutput')}：${state.lastOutput.name}`),
                      h('small', null, `${state.lastOutput.chars} 字`),
                    )
                  : null,
                h('div', { className: 'nvs-actions', style: { marginBottom: 0 } },
                  h('button', { className: 'nvs-primary nvs-wide', onClick: enable, disabled: busy }, busy ? t('enabling') : t('continueSession')),
                  h('button', { className: 'nvs-btn', onClick: () => showStudioView('charts') }, `▤ ${t('openCharts')}`),
                  h('button', { className: 'nvs-btn', onClick: () => showStudioView('text') }, `≣ ${t('openText')}`),
                  h('button', { className: 'nvs-btn', onClick: () => showStudioView('hooks') }, `◇ ${t('rightHooks')}`),
                  h('button', { className: 'nvs-btn', onClick: () => showStudioView('help') }, `? ${t('openHelp')}`),
                ),
              )
            : h('div', { className: 'nvs-actions', style: { marginBottom: 0 } },
                h('button', { className: 'nvs-primary nvs-wide', onClick: enable, disabled: busy || state === null }, busy ? t('enabling') : t('enable')),
                h('button', { className: 'nvs-btn', onClick: () => showStudioView('help') }, `? ${t('openHelp')}`),
              ),
        ),
        h(PanelCard, {
          title: t('settings'),
          right: saved ? h('span', { className: 'nvs-toast' }, `✓ ${t('saved')}`) : null,
        },
          h(Field, { label: t('rounds'), hint: t('roundsHint') },
            h(Stepper, {
              value: form.rounds, min: 0, max: 4,
              onChange: (value) => setForm({ ...form, rounds: value }),
            }),
          ),
          h(Field, { label: t('chapterWords'), hint: t('wordsHint') },
            h(Stepper, {
              value: form.chapterWords, min: 800, max: 8000, step: 100,
              onChange: (value) => setForm({ ...form, chapterWords: value }),
            }),
            h('input', {
              className: 'nvs-range', type: 'range', min: 800, max: 8000, step: 100,
              value: form.chapterWords,
              onChange: (event) => setForm({ ...form, chapterWords: Number(event.target.value) }),
            }),
          ),
          h(Field, { label: t('threshold'), hint: t('thresholdHint') },
            h(Stepper, {
              value: form.scanThreshold, min: 50, max: 95,
              onChange: (value) => setForm({ ...form, scanThreshold: value }),
            }),
            h('input', {
              className: 'nvs-range', type: 'range', min: 50, max: 95,
              value: form.scanThreshold,
              onChange: (event) => setForm({ ...form, scanThreshold: Number(event.target.value) }),
            }),
          ),
          h('div', { className: 'nvs-divider' }),
          h(Field, { label: t('outputMode') },
            h(Segmented, {
              value: form.outputMode ?? 'file',
              options: [
                { value: 'file', label: t('outputModeFile') },
                { value: 'chat', label: t('outputModeChat') },
              ],
              onChange: (value) => setForm({ ...form, outputMode: value }),
            }),
          ),
          h(Field, { label: t('outputDir'), hint: t('outputHint') },
            h('input', {
              className: 'nvs-search', type: 'text', value: form.outputDir ?? '',
              style: { margin: 0, maxWidth: 300 },
              placeholder: 'novel/我的输出',
              onChange: (event) => setForm({ ...form, outputDir: event.target.value }),
            }),
          ),
          h(Field, { label: t('panelTheme') },
            h(Segmented, {
              value: form.panelTheme ?? 'auto',
              options: [
                { value: 'auto', label: t('themeAuto') },
                { value: 'light', label: t('themeLight') },
                { value: 'dark', label: t('themeDark') },
              ],
              onChange: (value) => setForm({ ...form, panelTheme: value }),
            }),
          ),
          h(Field, { label: t('twist'), hint: t('twistHint') },
            h('div', { className: 'nvs-twist' },
              h(Stepper, {
                value: form.twist ?? 30, min: 0, max: 100,
                onChange: (value) => setForm({ ...form, twist: value }),
              }),
              h('input', {
                className: 'nvs-range', type: 'range', min: 0, max: 100,
                value: form.twist ?? 30,
                onChange: (event) => setForm({ ...form, twist: Number(event.target.value) }),
              }),
              h('span', { className: 'nvs-twist-val' }, String(form.twist ?? 30)),
            ),
          ),
          (form.twist ?? 30) >= 85 ? h('div', { className: 'nvs-warnbar' }, `⚠ ${t('twistWarn')}`) : null,
          h(Field, { label: '平台', hint: '番茄 / 起点 / 晋江 / 知乎盐选 / 纯文学' },
            h('input', {
              className: 'nvs-search', type: 'text', value: form.platform ?? '',
              style: { margin: 0, maxWidth: 220 },
              placeholder: '番茄',
              onChange: (event) => setForm({ ...form, platform: event.target.value }),
            }),
          ),
          h(Field, { label: t('autoPopup') },
            h('label', { className: 'nvs-check' },
              h('input', {
                type: 'checkbox', checked: form.autoPopup !== false,
                onChange: (event) => setForm({ ...form, autoPopup: event.target.checked }),
              }),
              form.autoPopup !== false ? t('on') : t('off'),
            ),
          ),
          h(Field, { label: '自动打开' },
            h('label', { className: 'nvs-check' },
              h('input', {
                type: 'checkbox', checked: form.autoChart !== false,
                onChange: (event) => setForm({ ...form, autoChart: event.target.checked }),
              }),
              t('autoChart'),
            ),
          ),
          h('div', { className: 'nvs-kv' },
            state?.lastOutput
              ? h('span', null, `${t('lastOutput')}：${state.lastOutput.name}`)
              : h('span', { className: 'nvs-note' }, t('textEmpty')),
            state?.lastOutput ? h('small', null, `${state.lastOutput.chars} 字`) : null,
          ),
          h('div', { className: 'nvs-actions', style: { marginBottom: 0 } },
            h('button', { className: 'nvs-primary', onClick: save, disabled: busy }, t('save')),
            saved ? h('span', { className: 'nvs-toast' }, `✓ ${t('saved')}`) : null,
          ),
        ),
        h(PanelCard, {
          title: t('rolesTitle'),
          sub: t('rolesHint'),
          right: h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            h('span', { className: 'nvs-badge' }, `${t('roleCount')} ${selectedRoles.length}/${roles.length}`),
            h('button', {
              className: 'nvs-btn',
              onClick: () => setShowRoles(!showRoles),
            }, showRoles ? t('collapseRoles') : t('expandRoles')),
          ),
        },
          !showRoles
            ? h('div', { className: 'nvs-chips' },
                selectedRoles.length === 0
                  ? h('span', { className: 'nvs-note' }, t('rolesDefault'))
                  : [
                      ...selectedRoles.slice(0, 10).map((id) => {
                        const role = roles.find((item) => item.id === id)
                        return h('span', { className: 'nvs-chip on', key: id }, role?.name ?? id)
                      }),
                      selectedRoles.length > 10
                        ? h('span', { className: 'nvs-chip', key: '__more' }, `+${selectedRoles.length - 10}`)
                        : null,
                    ],
              )
            : h('div', null,
                h('input', {
                  className: 'nvs-search', type: 'text',
                  placeholder: t('searchRoles'), value: roleQuery,
                  onChange: (event) => setRoleQuery(event.target.value),
                }),
                h('div', { className: 'nvs-actions', style: { margin: '0 0 4px' } },
                  h('button', {
                    className: 'nvs-btn',
                    onClick: () => setForm({ ...form, selectedRoles: roles.map((role) => role.id) }),
                    disabled: roles.length === 0,
                  }, t('selectAll')),
                  h('button', {
                    className: 'nvs-btn',
                    onClick: () => setForm({ ...form, selectedRoles: [] }),
                  }, t('clearAll')),
                  h('button', { className: 'nvs-btn', onClick: save, disabled: busy }, t('save')),
                ),
                roleGroups.map((group) => {
                  const items = group.items.filter(matchesQuery)
                  if (items.length === 0) return null
                  const chosen = items.filter((role) => selectedRoles.includes(role.id)).length
                  return h('div', { key: group.key },
                    h('div', { className: 'nvs-role-group-title' }, `${group.label} · ${chosen}/${items.length}`),
                    h('div', { className: 'nvs-chips' }, items.map((role) => h('button', {
                      key: role.id, type: 'button', title: role.duty,
                      className: selectedRoles.includes(role.id) ? 'nvs-chip on' : 'nvs-chip',
                      onClick: () => toggleRole(role.id),
                    }, role.name))),
                  )
                }),
              ),
        ),
        h(PanelCard, { title: t('newProject') },
          h(Field, { label: '书名' },
            h('input', {
              className: 'nvs-search', type: 'text', value: createForm.title,
              placeholder: '新书书名',
              onChange: (event) => setCreateForm({ ...createForm, title: event.target.value }),
            }),
          ),
          h(Field, { label: '平台' },
            h('select', {
              className: 'nvs-search', style: { margin: 0 },
              value: createForm.platform,
              onChange: (event) => setCreateForm({ ...createForm, platform: event.target.value }),
            }, ['番茄', '起点', '晋江', '知乎盐选', '纯文学', '暂不指定'].map((label) => h('option', { key: label, value: label }, label))),
          ),
          h(Field, { label: '题材' },
            h('input', {
              className: 'nvs-search', type: 'text', value: createForm.genre,
              placeholder: '都市 / 悬疑 / 玄幻…（可空）',
              onChange: (event) => setCreateForm({ ...createForm, genre: event.target.value }),
            }),
          ),
          h(Field, { label: '文风' },
            h('input', {
              className: 'nvs-search', type: 'text', value: createForm.tone,
              placeholder: '冷峻 / 华丽 / 细腻…（可空）',
              onChange: (event) => setCreateForm({ ...createForm, tone: event.target.value }),
            }),
          ),
          h(Field, { label: '篇幅' },
            h('select', {
              className: 'nvs-search', style: { margin: 0 },
              value: createForm.length,
              onChange: (event) => setCreateForm({ ...createForm, length: event.target.value }),
            }, ['短篇', '中篇', '长篇连载'].map((label) => h('option', { key: label, value: label }, label))),
          ),
          h(Field, { label: t('chapterWords') },
            h(Stepper, {
              value: createForm.chapterWords, min: 800, max: 8000, step: 100,
              onChange: (value) => setCreateForm({ ...createForm, chapterWords: value }),
            }),
          ),
          h(Field, { label: t('twist') },
            h(Stepper, {
              value: createForm.twist, min: 0, max: 100,
              onChange: (value) => setCreateForm({ ...createForm, twist: value }),
            }),
          ),
          h('div', { className: 'nvs-actions', style: { marginBottom: 0 } },
            h('button', { className: 'nvs-primary', onClick: createProject, disabled: createBusy }, createBusy ? t('loading') : t('createProject')),
          ),
          createMessage ? h('p', { className: 'nvs-hint' }, createMessage) : h('p', { className: 'nvs-hint' }, t('createHint')),
        ),
        h(PanelCard, { title: t('recent'), sub: projects.length === 0 ? t('noProjects') : null },
          h('div', { className: 'nvs-actions', style: { margin: '0 0 6px' } },
            h('button', { className: 'nvs-btn', onClick: () => showStudioView('style') }, `◇ ${t('learnStyle')}`),
          ),
          projects.map((item) => h('div', { className: 'nvs-kv', key: item.slug },
            h('span', { style: { flex: 1, minWidth: 0 } }, item.title),
            h('small', null, `${item.stage} · ${item.chapters} 章`),
            pendingDelete === item.slug
              ? h('button', {
                  className: 'nvs-btn',
                  style: { color: '#e05252', padding: '4px 8px', fontSize: 11.5 },
                  onClick: () => removeProject(item.slug),
                  disabled: busy,
                }, '确认删除')
              : h('button', {
                  className: 'nvs-btn',
                  style: { padding: '4px 8px', fontSize: 11.5 },
                  onClick: () => setPendingDelete(item.slug),
                  disabled: busy,
                }, '删除'),
          )),
        ),
        h('p', { className: 'nvs-note', style: { textAlign: 'center', marginTop: 10 } }, t('triggerHint')),
      )
    }

    // ---------------------------------------------------------------------
    // Plugin apply
    // ---------------------------------------------------------------------
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'novel-studio: dictionaries')
        const currentLocale = () => {
          try {
            const snapshot = ctx.locale.getLocale?.()
            const id = String(snapshot?.id ?? snapshot?.locale ?? 'zh').toLowerCase()
            return id.startsWith('en') ? 'en' : 'zh'
          } catch {
            return 'zh'
          }
        }
        const t = (key) => {
          const dict = currentLocale() === 'en' ? EN : ZH
          return dict[key] ?? ZH[key] ?? key
        }

        ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'novel-studio',
          order: 0.5,
          label: () => t('nav'),
          locale: NS,
        }, (owner = {}) => h(Icon, { size: owner.size ?? 16, active: owner.active === true }))), 'novel-studio: sidebar icon')

        ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'novel-studio',
          locale: NS,
          inject: () => ({ t, locale: currentLocale() }),
        }, (props = {}) => h(StudioPanel, props))), 'novel-studio: main panel')

        ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'novel-studio-overlay',
          order: 60,
          locale: NS,
          inject: () => ({ t, locale: currentLocale() }),
        }, (props = {}) => h(Overlay, props))), 'novel-studio: story map overlay')

        ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'novel-studio-text-overlay',
          order: 61,
          locale: NS,
          inject: () => ({ t }),
        }, (props = {}) => h(TextOverlay, props))), 'novel-studio: text overlay')

        ctx.effect(() => ctx.slots.inject('sidebar.right.tab.guide.entry', () => ctx.slots.register({
          name: 'sidebar.right.tab.guide.entry',
          key: 'novel-studio',
          locale: NS,
          inject: () => ({ t }),
        }, (props = {}) => h(GuideCard, props))), 'novel-studio: right sidebar guide card')

        // Primary surface: a real tab in the host right sidebar.
        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: RIGHT_PANEL_ID,
          locale: NS,
          inject: () => ({ t, locale: currentLocale() }),
        }, (props = {}) => h(RightPanel, props))), 'novel-studio: rightbar panel body')

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab.title',
          key: RIGHT_PANEL_ID,
        }, () => h('span', { style: { fontWeight: 600 } }, t('panelTitle')))), 'novel-studio: rightbar panel title')

        try {
          ctx.inject(['sidebarRightTabs', 'sidebarRight'], (scoped) => {
            const controller = scoped.sidebarRight
            rightbarController = controller
            scoped.effect(() => {
              const dispose = scoped.sidebarRightTabs.register({
                id: RIGHT_PANEL_ID,
                kind: RIGHT_PANEL_ID,
                priority: 'builtin',
                title: () => t('panelTitle'),
              })
              return () => {
                try { dispose() } catch { /* noop */ }
                if (rightbarController === controller) rightbarController = null
              }
            }, 'novel-studio: rightbar tab type')
          })
        } catch (error) {
          console.warn('[novel-studio] right sidebar unavailable:', error)
        }

        ctx.effect(() => {
          if (typeof document === 'undefined' || document.head === null) return () => {}
          const mark = 'data-nvs-styles'
          try {
            const existing = document.querySelector(`style[${mark}]`)
            if (existing !== null) {
              existing.textContent = CSS
              return () => {}
            }
            const tag = document.createElement('style')
            tag.setAttribute(mark, '1')
            tag.textContent = CSS
            document.head.appendChild(tag)
            return () => { try { tag.remove() } catch { /* noop */ } }
          } catch {
            return () => {}
          }
        }, 'novel-studio: styles')
      },
    }
  },
})

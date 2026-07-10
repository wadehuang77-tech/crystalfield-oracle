ALTER TABLE hd_report_section_defs ADD COLUMN generation_mode TEXT NOT NULL DEFAULT 'fixed';

UPDATE hd_report_section_defs
   SET generation_mode = CASE
     WHEN id IN ('personality', 'prescription', 'career', 'love', 'wealth', 'mission') THEN 'openai'
     ELSE 'fixed'
   END;

CREATE TABLE IF NOT EXISTS hd_fixed_knowledge (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  key         TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category, key)
);

CREATE INDEX IF NOT EXISTS idx_hd_fixed_knowledge_category
  ON hd_fixed_knowledge(category, sort_order, key);

INSERT INTO hd_fixed_knowledge (id, category, key, title, body, sort_order, active)
VALUES
  ('type-generator', 'type', 'generator', '生產者', '生產者擁有穩定的薦骨生命力，核心策略是等待回應。當身體對外界刺激產生清楚的「是」，能量會自然展開；若用頭腦主動追逐，容易累積挫折。', 1, 1),
  ('type-manifesting-generator', 'type', 'manifesting-generator', '顯示生產者', '顯示生產者同時具備薦骨續航與快速轉向能力，策略是等待回應後告知。你的學習來自嘗試、修正與快速整合，不必強迫自己走單一路線。', 2, 1),
  ('type-projector', 'type', 'projector', '投射者', '投射者的能量設計適合洞察、引導與管理系統，而非長時間大量輸出。等待正確邀請與認可是成功關鍵，錯誤場域會帶來苦澀。', 3, 1),
  ('type-manifestor', 'type', 'manifestor', '顯化者', '顯化者是啟動型能量，能獨立開創方向。行動前告知不是請求允許，而是降低阻力，讓周圍的人能跟上你的能量。', 4, 1),
  ('type-reflector', 'type', 'reflector', '反映者', '反映者九大中心皆未定義，能敏銳映照環境狀態。重大決定需等待月亮週期，透過時間、環境與對話看見真正清明。', 5, 1),
  ('authority-sacral', 'authority', 'sacral', '薦骨權威', '薦骨權威透過身體即時反應做決定，通常呈現為擴張、收縮、嗯哼或呃呃。它不是邏輯推演，而是生命力對選項的直接回應。', 1, 1),
  ('authority-emotional', 'authority', 'emotional', '情緒權威', '情緒權威需要等待情緒波浪走完整，不在高點承諾，也不在低點否定。清明不是瞬間答案，而是時間沉澱後仍然穩定的感受。', 2, 1),
  ('authority-splenic', 'authority', 'splenic', '脾臟權威', '脾臟權威是安靜、短暫、即時的直覺訊號，關於當下是否健康安全。它通常只說一次，練習重點是辨識身體的微小收縮與放鬆。', 3, 1),
  ('authority-ego', 'authority', 'ego', '自我權威', '自我權威透過真實意志與承諾感做決定。重點不是證明自己，而是誠實辨識「我是否真的想要，是否願意投入」。', 4, 1),
  ('authority-self-projected', 'authority', 'self-projected', '自我投射權威', '自我投射權威需要透過說出來聽見自己的方向。好的傾聽者能幫助你辨識聲音裡的清明，而不是替你下判斷。', 5, 1),
  ('authority-lunar', 'authority', 'lunar', '月亮權威', '月亮權威屬於反映者，透過約 28 天的月亮週期取得多角度感受。重大選擇需要時間與不同環境交叉驗證。', 6, 1),
  ('definition-none', 'definition', 'none', '無定義', '無定義代表沒有固定中心連接，能量高度開放。這不是空白，而是強大的環境感知能力，需要透過正確場域維持清明。', 1, 1),
  ('definition-single', 'definition', 'single', '單一定義', '單一定義表示已定義中心彼此連成一組，內在運作較一致，不需要依賴他人橋接能量，適合培養穩定的自我信任。', 2, 1),
  ('definition-split', 'definition', 'split', '雙重定義', '雙重定義表示能量分成兩組，容易被能橋接兩組能量的人吸引。成熟練習是理解互補，而不是把完整感完全交給他人。', 3, 1),
  ('definition-multiple', 'definition', 'multiple', '多重定義', '多重定義表示能量組更複雜，需要時間、環境與互動讓不同面向整合。你的多元性是資產，不必強迫自己簡化成單一樣貌。', 4, 1),
  ('center-head', 'center', 'head', '頭頂中心', '頭頂中心關於靈感、疑問與壓力來源。定義時有穩定的提問與啟發節奏；開放時容易吸收他人的焦慮與未解問題。', 1, 1),
  ('center-ajna', 'center', 'ajna', '邏輯中心', '邏輯中心關於概念、分析與理解方式。定義時思考模式較固定；開放時能看見多種觀點，但也可能為了顯得確定而過度解釋。', 2, 1),
  ('center-throat', 'center', 'throat', '喉嚨中心', '喉嚨中心關於表達、行動與被看見。定義時表達較穩定；開放時需等待正確時機，避免為了取得注意而急著說話。', 3, 1),
  ('center-g', 'center', 'g', 'G 中心', 'G 中心關於方向、身份與愛。定義時自我感較穩；開放時方向受環境影響很深，正確的人與地方會直接改變生命品質。', 4, 1),
  ('center-heart', 'center', 'heart', '心臟中心', '心臟中心關於意志、價值與承諾。定義時有固定意志力；開放時不需要用證明價值來換取愛或安全感。', 5, 1),
  ('center-sacral', 'center', 'sacral', '薦骨中心', '薦骨中心關於生命力、工作能量與身體回應。定義時有穩定續航；開放時需避免跟著他人的節奏過度工作。', 6, 1),
  ('center-solar-plexus', 'center', 'solar-plexus', '情緒中心', '情緒中心關於情緒波、感受與親密需求。定義時情緒有固定波動；開放時容易放大他人情緒，需要練習不立即反應。', 7, 1),
  ('center-spleen', 'center', 'spleen', '脾臟中心', '脾臟中心關於直覺、健康與生存感。定義時有穩定警覺；開放時可能抓住不健康的人事物，只因熟悉帶來安全感。', 8, 1),
  ('center-root', 'center', 'root', '根部中心', '根部中心關於壓力、推進與腎上腺動能。定義時壓力節奏較固定；開放時容易急著完成事情以擺脫外界壓力。', 9, 1)
ON CONFLICT(category, key) DO UPDATE SET
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = datetime('now');

INSERT INTO hd_fixed_knowledge (id, category, key, title, body, sort_order, active)
VALUES
  ('profile-1-3', 'profile', '1/3', '1/3 研究者 / 殉道者', '以深入研究建立安全感，並透過親身試錯找到真正可用的方法。你的智慧來自驗證，而不是紙上談兵。', 1, 1),
  ('profile-1-4', 'profile', '1/4', '1/4 研究者 / 機會主義者', '需要穩固知識基礎，也透過熟人網絡展開機會。信任關係會直接影響你的影響力。', 2, 1),
  ('profile-2-4', 'profile', '2/4', '2/4 隱士 / 機會主義者', '天賦常在獨處中自然成熟，再被熟悉的人看見與召喚。你需要保留退回自己的空間。', 3, 1),
  ('profile-2-5', 'profile', '2/5', '2/5 隱士 / 異端', '帶有自然天賦與投射場，別人容易期待你提供解法。界線能保護你不被不適合的期待消耗。', 4, 1),
  ('profile-3-5', 'profile', '3/5', '3/5 殉道者 / 異端', '透過試驗、碰撞與修正累積務實智慧，最終能為他人提供可落地的解方。', 5, 1),
  ('profile-3-6', 'profile', '3/6', '3/6 殉道者 / 榜樣', '前期透過大量經驗學習，中後期逐漸抽離整合，最後以真實經驗成為榜樣。', 6, 1),
  ('profile-4-6', 'profile', '4/6', '4/6 機會主義者 / 榜樣', '機會來自關係網絡，成熟後以穩定與可信任的生命狀態影響他人。', 7, 1),
  ('profile-4-1', 'profile', '4/1', '4/1 機會主義者 / 研究者', '同時需要固定基礎與人際影響力。你適合把穩定信念透過關係傳遞出去。', 8, 1),
  ('profile-5-1', 'profile', '5/1', '5/1 異端 / 研究者', '外界容易投射你是解決問題的人，因此更需要扎實基礎，避免承接不屬於你的期待。', 9, 1),
  ('profile-5-2', 'profile', '5/2', '5/2 異端 / 隱士', '你被看見時帶有強投射力，但天賦需要獨處滋養。回應正確召喚比主動證明更重要。', 10, 1),
  ('profile-6-2', 'profile', '6/2', '6/2 榜樣 / 隱士', '人生分階段成熟，最終以自然天賦與真實狀態成為可被信任的榜樣。', 11, 1),
  ('profile-6-3', 'profile', '6/3', '6/3 榜樣 / 殉道者', '透過豐富試驗累積生命智慧，成熟後能以更高視角示範如何真實地活。', 12, 1)
ON CONFLICT(category, key) DO UPDATE SET
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = datetime('now');

INSERT INTO hd_fixed_knowledge (id, category, key, title, body, sort_order, active)
VALUES
  ('channel-34-57', 'channel', '34-57', '34-57 力量通道', '關於直覺性的生命力量，能在當下快速感知什麼值得投入。成熟表達是信任身體，而不是用衝動證明力量。', 1, 1),
  ('channel-20-34', 'channel', '20-34', '20-34 超時通道', '將薦骨能量直接帶到當下行動，速度快、反應強。需要等待正確回應，否則容易忙碌卻失準。', 2, 1),
  ('channel-1-8', 'channel', '1-8', '1-8 靈感通道', '以獨特創造力影響集體，適合用個人風格帶來方向。成熟關鍵是等待被看見，而非迎合。', 3, 1),
  ('channel-13-33', 'channel', '13-33', '13-33 足跡通道', '保存故事、記憶與經驗的通道，能從過去提煉智慧。需要退隱整理，再於對的時機分享。', 4, 1),
  ('channel-2-14', 'channel', '2-14', '2-14 脈動通道', '關於方向與資源流動，能把能量投注到正確道路。財富與方向感需要透過身體回應校準。', 5, 1),
  ('channel-5-15', 'channel', '5-15', '5-15 韻律通道', '連結個人節奏與生命韻律，適合建立穩定習慣。失衡時容易被外界打亂，需保護自己的時間感。', 6, 1),
  ('channel-11-56', 'channel', '11-56', '11-56 求知通道', '把想法轉為故事與刺激的表達，適合分享觀點、旅行、教學與敘事。重點是啟發，不是給最終答案。', 7, 1),
  ('channel-7-31', 'channel', '7-31', '7-31 阿爾法通道', '民主式領導與方向引導的能量，適合在被認可時帶領群體。沒有邀請時容易被視為控制。', 8, 1),
  ('channel-36-35', 'channel', '36-35', '36-35 多變通道', '追求經驗、變化與情緒成熟的通道。需要分辨真正的體驗呼喚與逃避無聊的衝動。', 9, 1),
  ('channel-19-49', 'channel', '19-49', '19-49 融合通道', '敏感於需求、歸屬與關係契約。成熟表達是建立清楚價值與界線，而不是用情感綁住彼此。', 10, 1),
  ('channel-37-40', 'channel', '37-40', '37-40 共同通道', '家庭、社群、交換與承諾的通道。需要公平互惠，否則容易在關係責任中耗盡。', 11, 1),
  ('channel-6-59', 'channel', '6-59', '6-59 親密通道', '關於親密、繁衍與打破隔閡。情緒清明前不宜倉促靠近，成熟時能建立深度連結。', 12, 1),
  ('channel-10-20', 'channel', '10-20', '10-20 警覺通道', '在當下活出真實自我的通道，行動直接反映身份。重點是自然展現，不是表演自我。', 13, 1),
  ('channel-25-51', 'channel', '25-51', '25-51 啟動通道', '透過衝擊帶來覺醒與心靈啟動。成熟表達是喚醒生命，而不是為了震撼而冒險。', 14, 1),
  ('channel-28-38', 'channel', '28-38', '28-38 掙扎通道', '尋找生命意義並為值得的事奮戰。需要確認戰場是否正確，否則會把力氣用在無意義對抗。', 15, 1),
  ('channel-39-55', 'channel', '39-55', '39-55 情緒通道', '情緒、靈感與豐盛感的波動通道。創造力來自心情流動，不能被固定產出節奏完全綁住。', 16, 1),
  ('channel-26-44', 'channel', '26-44', '26-44 投降通道', '關於記憶、說服、銷售與資源整合。成熟表達是誠實交換，失衡時容易過度包裝。', 17, 1),
  ('channel-21-45', 'channel', '21-45', '21-45 貨幣通道', '管理資源、掌握分配與物質秩序的通道。需要清楚權責，適合在信任結構中管理價值。', 18, 1)
ON CONFLICT(category, key) DO UPDATE SET
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = datetime('now');

WITH RECURSIVE gates(n) AS (
  VALUES(1)
  UNION ALL
  SELECT n + 1 FROM gates WHERE n < 64
)
INSERT INTO hd_fixed_knowledge (id, category, key, title, body, sort_order, active)
SELECT
  'gate-' || printf('%02d', n),
  'gate',
  CAST(n AS TEXT),
  '閘門 ' || n,
  '閘門 ' || n || ' 是人類圖 64 閘門中的固定知識單元，用來描述一種特定的生命主題、天賦頻率與陰影學習。實際解讀時需結合所在中心、是否形成通道、人生角色與內在權威，才能判斷它如何在個案身上成熟表達。',
  n,
  1
FROM gates
WHERE true
ON CONFLICT(category, key) DO UPDATE SET
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = datetime('now');

# Kiến trúc và bất biến

## Luồng dữ liệu

`client/scene.tsx`: hình học 3D, instancing bàn ghế/nhân vật, nội suy, camera, input 15 Hz. `client/main.tsx`: UI, kết nối/phiên, chat, game, donate. `client/voice.ts`: kết nối WebRTC SFU, micro/listen/mute/volume. `client/audio.ts`: nhạc và âm thanh gốc tổng hợp bằng Web Audio.

`shared/world.ts`: tọa độ 17 bàn, 102 ghế, va chạm, tốc độ, kiểu trạng thái. `shared/protocol.ts`: schema đầu vào Zod. `shared/vietqr.ts`: EMVCo TLV + CRC16 VietQR.

`server/game.ts`: trạng thái phòng trong Map; chỗ/ghế/quyền/mini game là dữ liệu duy nhất có thẩm quyền. `server/index.ts`: transport, origin/rate limit, tick và interest management, webhook có chữ ký. `server/voice.ts`: quyền SFU/token/revoke.

## Sức chứa, phiên và quyền

- Check 100 và thêm phiên là cùng đoạn đồng bộ, không có await; Node event loop là nơi cấp chỗ nguyên tử của một phòng.
- 17 bàn × 6 ghế là 102 vị trí. Mỗi phòng vẫn tối đa 100 phiên. Nhiều phòng độc lập.
- Session bearer ngẫu nhiên 256 bit chỉ ở sessionStorage/ack. Không có trong link mời, snapshot, state hay log. Sau resume token xoay; nối lại không thêm nhân vật.
- Mất kết nối giữ chỗ/ghế **20 giây**; vẫn tính vào 100. Thu hồi kênh voice ngay (API timeout 3 giây); các người còn lại tự nối lại kênh mới với mic tắt. Hết hạn thử thu hồi voice rồi mới xóa phiên/ghế. Nếu SFU thu hồi lỗi, giữ chỗ thay vì mở ghế có voice cũ (fail closed) và thử lại.
- Chủ quán là người vào quán sớm nhất (thời gian bằng nhau thì UUID thứ tự từ điển), kể cả người đang giữ phiên. Chuyển quyền khi rời hẳn/hết hạn, không chuyển chỉ do mất mạng ngắn.
- Điều phối bàn là người **ngồi bàn sớm nhất đang kết nối** (hòa thì UUID). Người offline không chặn lượt. Khi người được chọn rời/offline, chọn lại trong số còn kết nối; bàn không còn người online thì kết thúc lượt.
- Mọi yêu cầu ngồi kiểm tra khoảng cách ≤3 đơn vị tới đúng ghế; đang ngồi phải đứng trước khi đổi bàn. Tất cả lệnh async của phòng xếp hàng, tránh đua với thu hồi SFU. API SFU timeout 3 giây, không retry liên vùng trong hàng đợi phòng.
- Mỗi bàn tối đa 7 món; mọi thành viên gọi món, chỉ điều phối đang ngồi mới dọn. Một lượt mini game mỗi bàn. Câu hỏi 24 câu gốc; random tại server bằng crypto.randomInt.
- Mời ra kiểm tra host ở backend, ngắt voice trước, xóa session và disconnect socket. Khách vẫn có thể tạo phiên mới.

## Chuyển động và mạng

Server tick 20 Hz, nhận vector hướng tối đa 22 input/giây (burst 30), không nhận tọa độ từ trình duyệt. Tốc độ đi bộ 2 đơn vị/giây; mỗi tick clamp 100ms, input quá 250ms dừng. Collision kiểm tra tường, bàn, quầy/thùng/chậu và ghế có người.

Snapshot mỗi 100ms cho ô không gian 8×8 và 8 ô kề; người ở xa mỗi 1 giây. Snapshot đóng gói tuple để giảm tên trường lặp. Packet volatile: không tích hàng snapshot cũ. Roster và overview bàn cập nhật chính xác theo sự kiện, không theo từng khung hình. Mọi action có bucket tổng 8/s burst 12 và thêm giới hạn riêng cho chat/seat/food/emote/voice. Payload transport tối đa 4KB, chat 240 ký tự, tên 24/40. Dữ liệu công khai tối đa 100 nhân vật.

Full room state phát khi có thay đổi cấu trúc (join/seat/food/round/emote), bao gồm overview các bàn, không phát mỗi lần đi. Chat quán gửi cùng quán; chat bàn chỉ gửi socket đang ngồi cùng bàn. Hiệu ứng Dô chỉ cùng bàn, vẫy tay chỉ người gần. Nhãn tên chỉ hiện gần; chuyển động xa ít cập nhật. Text render bằng React, không dùng innerHTML.

Quá tải/DoS quy mô lớn cần rate limit tại reverse proxy/edge; guest sessions không thể chống Sybil tuyệt đối. Giới hạn IP: burst 120 điểm, hồi 1 điểm/15s, join 1, create 20; dọn bucket nhàn 5 phút. Resume có bearer hợp lệ không tiêu thụ bucket IP để tránh hàng loạt người cùng NAT hết hạn vì giới hạn join; mỗi socket tối đa 3 lần enter trong 10s. Tối đa 200 phòng/tiến trình; phòng trống xóa sau 60s. Chưa có persistence, cross-process ownership hay Redis. Để mở rộng phải định tuyến room → tiến trình chủ và có điều phối ownership; thêm adapter Socket.IO không đủ.

## Voice isolation

Mỗi bàn dùng LiveKit room có thế hệ ngẫu nhiên `qndh-CODE-TABLE-GENERATION`, tối đa 6 trên cấu hình SFU. Identity = UUID khách + epoch. Endpoint token là lệnh socket đã có phiên, không nhận tên room SFU từ browser.

1. Chỉ người đang ngồi/online được xin token, TTL 30s.
2. Token có roomJoin, **canPublish=false, canSubscribe=false, canPublishData=false**.
3. Webhook `participant_joined` xác thực chữ ký/hash bằng SDK, xếp hàng cùng lệnh ghế, so khớp phòng + bàn + identity epoch + online.
4. Đúng quyền mới UpdateParticipant cho nghe/phát microphone. Sai/epoch cũ thì RemoveParticipant; token cũ không thể nghe trong khoảng chờ webhook.
5. Rời bàn/đổi bàn/kick/expiry xóa toàn bộ thế hệ kênh bàn bằng DeleteRoom từ server trước khi giải phóng ghế. Những người còn lại tự nối vào kênh mới với mic tắt; mỗi bàn chỉ tối đa 6 người. Cách này chặn cả token đã được SDK/SFU tự refresh với quyền media cũ: token đó chỉ có thể tạo lại phòng thế hệ cũ rỗng, không nghe được người còn lại ở kênh mới. Client cũng disconnect và stop local tracks. Revoke lỗi thì không giải phóng quyền logic.

Không ghi âm, egress audio hay STT. Không có secret SFU ở frontend. Quyền mic từ user gesture, echo cancellation/noise suppression/AGC khi có. Game tiếp tục nếu voice lỗi. Webhook chưa chạy thì không bật voice; nếu cấu hình sai, participant giữ zero rights.

Camera raycast với khối tĩnh, mái và nhà; giữ khoảng cách trước vật cản, nội suy theo nhân vật. Avatar dùng instancing, ẩn mắt/giảm cập nhật pose nhân vật xa hơn 20 đơn vị.

## Character motion and PBR surfaces
`client/avatar.ts`: pure joint/pose calculations and geometry. Two-segment IK for knees and elbows; a stance foot remains at its world position as the character advances. Gait phase advances by actual interpolated distance, not elapsed time alone. `client/avatars.tsx` emits the pose as shared instanced body/prop parts for all real players; distant poses are throttled. Reduced motion suppresses body/head sway while keeping walking articulation.

`CHEERS_MS=3600`, `WAVE_MS=2400` are shared with server. The server authorizes the action and sends its deadline. Clients estimate server clock offset from snapshots, then sample the same pick-up → raise → extend/hold → place-down sequence. Personal seated mugs derive from seating, independent of the seven shared menu slots. While grasped, mug matrices follow the wrist with a fixed grip offset; otherwise the mug rests on the table. Standing/waving does not produce a floating drink.

`client/materials.ts`: caches 12 local PBR textures shared by surface materials; physical box UVs avoid stretching photographs. Low graphics omits transmission and dynamic shadows. Detailed geometry and PBR are not a claim of 100-device GPU capacity.

## Continuous limb surfaces / actual sipping contact
`client/limbs.ts` owns shared continuous limb geometry and GPU deformation with per-instance three-point joint controls. Cubic Hermite sections have a continuous tangent across the hidden elbow/knee. Matching depth deformation keeps shadows aligned. This replaces eight disconnected limb capsules with four draw calls for the continuous limbs. Shirt/skin colors are per instance; the cloth hem is above the elbow, not at the joint. IK remains internal and uses a 3D pole for natural elbow direction.

The 3.6-second emote now includes a short sip after the toast. Between 2.15 and 2.85 seconds, the actual near-rim point `(0, .17, -.133)` in mug space is kept at the transformed mouth anchor. The mug tilts up to 1.05 radians around this lip contact; its center and gripping hand are derived from that constraint. It returns to the table by 3.3 seconds and releases by 3.6. Backend protocol and room state are unchanged.

Standing/walking posture: hip height is derived from foot reach instead of a fixed crouched height. At rest, leg/arm flexion is below 12 degrees; during walking a ground support is always present, the stance leg extends with a brief weight-transfer bend and the free foot lifts at most 11 cm. Hands hang below the waist and swing in opposition to the legs. Stride is 1.3 units at server speed 2 units/s. Seated and mouth-contact sipping poses retain their own targets.

## Social gestures, authoritative drinks and stage

`shared/social.ts` owns gesture durations, seven dance names, stage/ramp dimensions, floor height, the 120 BPM tempo and level formula. Current walking speed is 2 units/s. The same floor-height function drives movement step validation and avatar/name/camera elevation; steps across the .45-unit platform edge are blocked, gradual ascent via either 3.5-unit ramp is permitted. Stage speakers are collision obstacles.

`Player` now publishes carryingBeer, beerCount, intoxication, soberAt, dance and danceStartedAt. Clients cannot submit counts, intoxication levels, positions or vote totals. Carrying requires pickup near a table/bar or while seated; it survives standing and is stowed when sitting. Invitation validates a nearby occupied table and emits a local effect; it does not increment the drink count. Clap/dance require a free hand pair.

The server records an internal drinkDue when cheers starts, settles it once after 3600ms, and never includes drinkDue in public data. Movement, standing before completion or disconnect cancels the unfinished drink. A command at/after the deadline settles the prior drink first. Count updates use compact public player patches rather than broadcasting the full room. `beerCount` is the completed total; `intoxication` is remaining virtual alcohol load, capped at 32 (level 10). Level is 0 below 5, otherwise min(10, 1 + floor((load-5)/3)). A completed drink adds one load and sets `soberAt` to its actual completion deadline +60s. Each elapsed quiet interval removes 3 load; values below 5 become zero. Recovery never changes beerCount. Settling uses the drink deadline first, then catches up to the current server clock, preserving event ordering after delayed ticks. Tick, commands, disconnect and resume all settle recovery; changes use compact player patches, with no per-tick patch while sober. Manual reset clears count/load/deadline. Clients cannot submit either count or deadline.

Movement remains authoritative: level 2–9 applies a bounded sinusoidal heading drift from server time and reduces speed (level 9: 1.44 units/s). Level 10 uses 0.6 units/s and no upright dances/carried cups/standing gestures; avatar pose is hands-and-knees crawling with the existing internal fixed-length bones and continuous skin. Seating remains possible. When recovery crosses 10→9, normal upright locomotion returns. Camera focus/name height follow the lower crawl. Reduced motion removes visual sway/orbit and smoke puffs; it does not change authoritative locomotion rules.

`smoke` is a 4800ms emote in the shared validated gesture enum. It requires the carried cup to be stowed; seated use is allowed. The rig moves the cigarette filter to its mouth anchor, adds an ember, then lowers the hand and exhales three staggered transparent clouds from the mouth during the final 1.4 seconds. Clouds move forward, rise, expand and dissipate before the gesture ends. Smoke uses an unlit translucent material so the evening lighting does not hide it. Movement cancels it; server timestamps synchronize observers. It is a cosmetic action with no counters or consumable economy. All meshes use the existing instancing pipeline.

Persistent dance poses derive from a room beat epoch. Movement stops dancing. Stage battle state has consent, a 12s invitation deadline, a 20s round, a per-round Set of spectator identities, one vote per identity, no self-vote, a shared 48-unit spectator range and a server-calculated winner/tie. Departure or stopping cancels, with no invented winner. Guest identities are session-level and do not prevent a human using multiple guest sessions. No wagering or rewards. Stage patches carry just the current public stage state; the voter Set stays private.

`client/stage.tsx` draws the platform/ramp, speakers, sign/truss and four softly pulsing fixtures (two in low quality). Light modulation is 2 Hz with no white/black strobe; reduced motion makes fixtures static. `client/audio.ts` synthesizes an original electronic kick/bass/hat/lead loop, schedules it against the shared 120 BPM epoch, attenuates by distance, uses a separate volume and ducks under voice. Playback still requires a player gesture. No external track, microphone recording or new SFU scope.

Rear stage: `(0,-12)`, 16 × 8, 0.45 high. Two ramps have opposite rise directions; shared `floorHeight` owns both and `stageWaypoint` chooses the nearer approach. Every chair ring lies in front of the stage, outside the platform/ramps, with at least 8 units between table centres. Stage speaker coordinates are shared by rendering and collision. Audience radius is shared (48 units), including all seated spectators; camera stage viewing is local only and automatically ends on standing or dragging.

`shared/world.ts` owns the street spawn, gate/fences, reception footprint, WC walls/door and six parked vehicle footprints. Fresh room arrivals use `spawnPosition`; session resume preserves position. Street bounds extend to z=46, with a continuous zero-height road/courtyard threshold. The gate is the only opening in the front fence. Fixtures and walls are authoritative movement obstacles; WC has a reachable opening and interior. `client/venue.tsx` renders those shared footprints. Existing scenery primitives/material caches/signage live in `client/scenery.tsx` for reuse. Hiphop, krump and running man extend the existing server-validated dance enum and room beat, preserving hidden-bone IK and continuous skin. No new account system, NPC, booking or driving behavior is introduced.

`vomit` extends the shared emote enum with a 4200ms duration. Server authorization requires current level >=5 and an empty carried hand; level-10 crawling permits this emote as an exception. It clears current movement on start, stops on further movement or recovery below level 5, and preserves count/load/recovery deadline. The rig bends the torso/head, brings a hand toward the belly and uses four short-lived instanced droplets from the mouth, including a crawling variant. Reduced motion uses one droplet and omits extra heaving. Nameplate Html distanceFactor is 8 (formerly 14), with 10px text and 2px/6px padding.


## Appearance, running and reception NPC
`shared/appearance.ts` owns eight character presets (four male/four female), six facial profiles, palette and dimensional transforms. `appearanceSchema` validates avatar/face indices, finite height 1–2 m, integer weight 40–150 kg and allowed colors. Legacy profile packets receive face=0, height=1.7, weight=65 defaults; local preference migration clamps invalid stored appearance. Invalid network input is rejected. The appearance command only changes its caller and broadcasts public player patches; reconnect uses the existing server profile, not stale client-supplied appearance.

All poses retain the shared internal rig. Presets add bob/long/ponytail/bun hair meshes, facial/eye/nose/mouth proportions and individual skin/hair colors. Height scales the whole local pose against its native standing bounds; weight scales width/depth. Mouth and held props share the root transform. Seated root offset anchors the resting mug near the existing tabletop; occupied stools extend by the corresponding pelvis lift. Camera focus/name height follow the selected scale. Collision footprints and base movement speed do not depend on appearance.

`CharacterEditor` is reused before entry and in the in-room modal. The lazy 3D preview and the receptionist render through the same `Avatars` pipeline with local pose positions, without writing to player `targets`/`visuals`. They never enter room rosters. Player avatars remain instanced with the original 100-player cap. Appearance is session memory; device preferences persist locally, and room state is still lost on server restart.

Movement input accepts a validated boolean run flag, default false for old clients. The server publishes effective `running` on changes and clears it on stale input, seating or disconnect. Walking is 2; running is 2.5 below intoxication level 10. Running uses a longer step/higher foot swing/stronger opposing arm motion. Drunk run heading drift is server-clock sinusoidal with amplitude .05 × level, versus .035 × (level−1) for walking; it remains subject to all existing collision and step checks. Level 10 ignores run and stays at 0.6. Shift or a toggle shared with touch controls supplies intent; no client speed value is accepted.

The receptionist is a separate static NPC at the shared `RECEPTION_HOST` footprint, labeled as NPC. Its counter was lowered to keep the face visible. `reception` requests are length/rate limited, require standing within 5.5 units of the counter, and return a private acknowledgement. `server/reception.ts` provides deterministic Vietnamese replies using current table occupancy and fixed venue facts. There is no external AI/service, voice, chat broadcast, seat reservation or NPC player slot. UI supports suggested questions and free text, with explicit distance, busy and error states.

Reception chat autoscroll is confined to the log container via `scrollTop=scrollHeight`; its React effect returns no DOM call result. Replies are checked for a string before insertion. Pending/error state is local and user messages appear before the acknowledgement; malformed replies cannot become React object children. `GameBoundary` at the root gives an explicit reload screen for unexpected React render/effect failures, preserving stored preferences. DOM lifecycle/input/retry regressions use jsdom as a dev-only dependency.


## Rest posture and durable player feedback
Lying is a persistent server-owned `Player.lying` flag, controlled by the strict `lie` command, not a finite timestamp emote. It requires no seat/cup/active emote and full-body flat-floor clearance via shared `canLie`. Lying cancels dancing, drinking and run input. Stand or a fresh movement input clears lying; level 10 then uses the existing crawl rule. Seating, other gestures, dancing, pickup and appearance edits require rising first. Resume preserves lying. The rig reuses fixed-length standing bones, arms resting over the torso, then applies a rigid horizontal transform to meshes and joints; hair is adjusted to keep it above the floor. Camera/name height follows the lower posture. Pose changes are compact public player patches.

Feedback uses a separate strict shared schema: six categories, 10–1000 trimmed characters, stripped non-display control codes. Only an active player session can submit. Game applies a one-per-minute limit and supplies nickname/room metadata itself. Its existing outward hook pattern delegates persistence to FeedbackStore; acknowledgements return only after append/fsync completes. Failed persistence refunds that player's feedback bucket so retry is possible. Feedback never appears in room chat/state or other clients' data.

FeedbackStore serializes appends in the one-process owner, writes private JSONL under DATA_DIR (default ./data, mode 0700/0600), and does not depend on room memory. It validates records on read, never silently truncates or deletes damaged data. There is no public feedback-list/admin HTTP route. The local owner command `npm run feedback:report` produces an escaped, script-free standalone HTML report under artifacts, with real per-category 7/30-day/all counts and the latest 100 entries. Data/reports are excluded from source packaging and git; the Docker game_data volume keeps canonical entries across container replacement. Guest session counts are not verified unique humans, and this is not a moderated/public idea-voting system.

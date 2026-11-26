# Kết quả kiểm tra — 03/11/2026

## Đã chạy và qua

- `npm run check` và `npm run build`: TypeScript và Vite production build thành công.
- `npm test`: **77/77** test qua. Check giới hạn phòng độc lập, giữ chỗ 20s, tranh ghế đồng thời, 6 ghế, khoảng cách/tốc độ/va chạm, bearer nối lại xoay, expiry/chuyển chủ, quyền chat/món/mini game/kick và dữ liệu VietQR, cùng các phần bổ sung bên dưới.
- Voice security unit test dùng **mock API SFU**, không phải âm thanh thật: token media ban đầu false, TTL 30s, SFU room maxParticipants=6, xóa thế hệ kênh cũ/đổi thế hệ mới và hủy quyền phiên cũ.
- `npm install` sau cập nhật Zod 4.6.7: npm audit báo **0 vulnerabilities** tại thời điểm cài. Không dựa vào kết quả audit offline.
- HTTP frontend và `/api/health` trả thành công. Hiện tại `voiceConfigured=true` với LiveKit native local; bản source mới chưa chạy setup vẫn báo false.
- Kiểm tra máy móc Impeccable: một cảnh báo `border-top:7px` là tóc của avatar CSS nhỏ, không phải border trang trí thẻ. Không có lỗi build từ cảnh báo này.

## Tải mô phỏng qua transport thật

Phép đo trên bố cục cũ, trước các lần chuyển sân khấu và thêm đường/cổng/WC (không chạy lại benchmark tải cho bố cục hiện tại). Chạy `npm run test:load` trên Darwin arm64, Node 26.3.0, một máy chạy cả backend và 100 client Node. Không dựng GPU, không gửi audio. Dữ liệu gốc: [results/load.json](results/load.json).

| Chỉ số | Kết quả |
|---|---:|
| Phiên cùng phòng | 100 |
| Thời lượng sau kết nối | 45 giây |
| Phiên có di chuyển được máy chủ xác nhận | 100/100 |
| Phiên có gửi chat | 100/100 |
| Bot đến và ngồi ghế bằng input thực | 85/100 |
| Bàn khởi chạy mini game | 17/17 |
| Lệnh thành công được đo | 957 |
| Độ trễ ack p50 / p95 / p99 | 9 / 41 / 63 ms |
| RSS cao nhất, chỉ backend | 135 MB |
| Event-loop p99 lớn nhất qua cửa sổ 5s | 40 ms |
| CPU backend cao nhất qua cửa sổ 5s, xấp xỉ một lõi | 34% |
| Tổng JSON snapshot khách nhận | 106.36 MiB |
| JSON snapshot trung bình toàn máy chủ | 2.36 MiB/s |
| Phiên thứ 101 | Bị từ chối |

100 bot được đặt tên `[BOT TẢI]`, gửi hướng di chuyển và đi theo đường trên sàn, không gán tọa độ trực tiếp. 15 bot chưa đến ghế do đường tìm lưới đơn giản mắc ở ghế có người hoặc cạnh dốc sân khấu; chúng vẫn di chuyển và chat trước đó. **Không tuyên bố 100 bot đều đã ngồi**. Tìm đường của bot chỉ nằm trong test, không điều khiển người chơi.

Byte snapshot là JSON payload, không bao gồm TLS/Socket.IO overhead, chat/overview và SFU. CPU lấy delta process.cpuUsage/5s, có cả khởi động trong cửa sổ đầu; không phải benchmark sản xuất. Tải quán mới có roster/food/round full state tạo burst, cần cân nhắc đường truyền VPS. Đây là phép đo ngắn, chưa phải soak test nhiều giờ hoặc nhiều phòng cùng đầy.

## Chưa kiểm chứng

- **Trình duyệt/GPU/cảm ứng**: quyền mở localhost qua công cụ trình duyệt bị từ chối. Không chạy đường vòng, không có screenshot xác nhận; chưa đo FPS/bộ nhớ GPU hay rà bố cục desktop/mobile thực tế. Mã có WebGL error boundary, keyboard/touch, dialog native/focus, nhưng chưa được chứng nhận bằng thao tác trực quan.
- **Micro/thiết bị và Internet**: SFU local đã truyền âm tổng hợp thật như kết quả bên dưới. Chưa thử tiếng nói qua micro vật lý, echo/ducking thực, sáu thiết bị, TURN, thiết bị bị rút, hộp thoại quyền mic hoặc tải 100 SFU participants. Test local không thay thế các bước này.
- Docker/Caddy/LiveKit self-host là cấu hình bàn giao; chưa chạy container hay cấp chứng chỉ thật. Bản ghim LiveKit v1.13.11 đối chiếu release chính thức ngày 25/10/2026.
- VietQR đã kiểm tra TLV/BIN/tài khoản/nội dung/CRC/no amount/no owner name bằng test. **Chưa quét bằng ứng dụng ngân hàng thật**; người dùng phải đối chiếu người nhận trong app ngân hàng trước chuyển. Game không xác nhận nhận tiền.
- Chưa vận hành với 100 người thật, nhiều thiết bị hay mạng di động. Chưa có persistence, khôi phục room sau restart, horizontal scaling hay chống Sybil cho khách không tài khoản.

## Checklist nghiệm thu trên thiết bị thật

1. Hai trình duyệt độc lập: tạo/tìm/vào bằng mã/link, thấy nhau đi, tranh ghế, 6 người/bàn; chat quán và bàn không lẫn.
2. Hai bàn khác nhau: gọi/dọn món, Dô, mini game; chủ và điều phối rời; reconnect dưới và trên 20s. Link chỉ có mã phòng.
3. Sáu thiết bị/mạng trong cùng bàn: nghe/nói, mic mặc định tắt, mute cá nhân, PTT và volume riêng; chuyển bàn/kick/mất mạng ngắt audio cũ. Khi một thành viên rời, những người còn lại đổi kênh và mic tắt.
4. Chặn UDP để ép TURN/TLS; từ chối quyền mic/rút thiết bị; webhook down thì zero media rights, SFU API down thì không giải phóng ghế có quyền cũ.
5. Desktop và điện thoại: camera, va chạm/mái, nhãn xa, joystick/chat không chồng, low graphics, reduced motion, keyboard/focus/đóng donate và QR fallback.
6. Quét QR bằng app ngân hàng, đối chiếu Vietcombank 1035433028, không số tiền cố định và không tên giả. Không tự nhận tiền trong UI.
7. Đo FPS/GPU, CPU/RSS/network, p95/p99 và lỗi với người thật; đo SFU riêng theo số kết nối/thu/phát. Chỉ công bố sức chứa đã qua nghiệm thu.

## Sửa kết nối trình duyệt cùng origin — 03/11/2026

Máy chủ trước đây bắt buộc header Origin cho mọi handshake; browser polling cùng origin có thể không gửi header đó, nên bị HTTP 403 dù /api/health vẫn 200. Đã thêm nhận diện same-origin bằng Sec-Fetch-Site và Host thuộc danh sách cho phép; Origin ngoài danh sách vẫn bị từ chối. Không tin X-Forwarded-Host cho quyết định này.

20/20 unit test qua, production build qua. Đã thử Socket.IO qua chính proxy Vite cổng 5173: client polling không Origin tạo quán, client WebSocket có Origin vào cùng quán, số người 2/100. HTTP handshake same-origin trả 200; Origin nguồn ngoài trả 403. Kiểm tra này là transport thực, không thay thế thao tác trình duyệt/GPU.

## PBR và cử chỉ có khớp — 03/11/2026

Bản cập nhật theo ảnh tham khảo của người dùng: 12 ảnh PBR CC0 lưu nội bộ, vật liệu inox/kính, camera thấp hơn, hình học nhân vật tròn có khớp và ly bia ảo gắn vào tay khi Dô. Tốc độ đi giảm từ 5 xuống 2,2 đơn vị/s; phép tải socket mới nhất đã được cập nhật ở bảng trên, vẫn không xác nhận GPU của bản đồ họa mới.

27 unit test qua, gồm 6 test pose mới (chân trụ đứng yên theo world khi thân đi; chân vung nhấc và đổi bên; gối gập khi ngồi; ly được lấy–nâng–đặt lại, giữ offset với tay; giảm chuyển động không làm mất bước chân; toàn chu kỳ không có matrix NaN) và kiểm tra máy chủ dành đủ 3,6 giây cho Dô, không chồng cử chỉ, hủy khi đứng.

Các URL của cả 12 JPEG đã trả HTTP 200 image/jpeg. Impeccable detector không có cảnh báo trên các tệp UI đã sửa. Build TypeScript/Vite thành công.

Người dùng đã đồng ý kiểm tra trình duyệt trong chat, nhưng công cụ tiếp tục báo **saved user permission / managed policy** chặn localhost. Không dùng đường vòng. Chưa có ảnh chụp hoặc thử GPU để xác nhận chất lượng hình ảnh/bước đi thực tế; các test pose là toán học và đồng bộ mạng, không phải motion capture hay nghiệm thu thị giác. Nhân vật vẫn là mô hình tròn/chibi tự tạo, không phải người quét 3D. Chưa đo FPS/GPU 100 người cho bản PBR.

Thử tích hợp qua Vite :5173 sau cập nhật: hai phiên Socket.IO thật (được đánh dấu TEST) di chuyển bằng vector input, đến bàn 15, ngồi hai ghế và nhận cùng deadline/emote bắt đầu (chênh 3600ms). Cả hai rời và giải phóng phiên thành công. Đây là kiểm tra transport/logic, không phải hai trình duyệt dựng cảnh. Âm thanh chạm ly được lên lịch ở +1850ms từ mốc máy chủ, bỏ qua nếu người phát/nghe đã rời bàn.

## Hide joints / bring the mug to the mouth
30/30 tests passed after replacing segmented limbs with continuous skin. New checks cover centerline/tangent continuity through the internal joints, fixed upper/lower bone lengths over walking/waving/sipping, and actual rendered mug-rim contact with the mouth for every sampled instant of the sip and all three avatar variants. The cup tilts toward the mouth, stays below the eye line at the contact point and retains the same hand grip offset. The old separate limb capsules are no longer in the rendered part list. Shader depth deformation follows the same skin surface. Impeccable detector returned no findings.

These are geometry/pose checks and TypeScript/build validation; saved browser access policy still prevents direct visual/GPU inspection. No new 100-device graphics-performance claim is made.

## Upright stance / natural walking correction
32/32 tests passed, including near-straight arms/legs at rest (<12° flexion), hands below the waist, continuous ground support, no deep crouch during weight transfer, limited free-foot lift and constant bone lengths. Server walking speed is now 1.6 units/s with a 1.3-unit stride. Supporting foot reach controls pelvis height. Mouth/rim contact and seating tests continue to pass. These are pose/build checks; current browser access policy still prevents visual/GPU verification. Earlier 100-client load measurements were taken with earlier walking speed/graphics.


## Social / stage / progressive virtual intoxication
42/42 unit tests pass and production build succeeds. New coverage includes cup pickup/invitation proximity, actual occupied tables, carried glass across standing, movement/disconnect cancelling incomplete drinks, exactly-once completion including a command at the deadline, levels at 5/8/11/... cups, reset, gestures/dance pose matrices, the physical ramp, dance-off consent, one nearby spectator vote, authoritative timing/winner and cancellation with no invented winner.

`node --import tsx tests/social-live.ts` passed against the local Vite proxy with **3 real socket clients, labeled TEST, in a private room**. They walked to a table, picked up a glass, delivered an invitation, completed five carried drinks to reach level 1, walked up the stage ramp, performed two different dance styles, accepted a dance-off, cast a vote, rejected a duplicate, received the same final result after 20s, reset the count and left cleanly. Raw report: [results/social-live.json](results/social-live.json).

The new 45s synthetic 100-client load passed: all 100 moved and chatted, 85 sat via real movement, 17 tables started mini-games, and client 101 was rejected. 15 bot routes remained blocked at occupied chairs or the ramp lip; this is reported, not counted as seated. The grid navigator is only the test driver. Current values are in the top table and [results/load.json](results/load.json). This test exercises the game server, not 100 rendered avatars, real audio devices or LiveKit load.

The browser tool still has a saved permission/policy denial for localhost, despite the user's earlier chat consent. No alternate browser path was used. Stage visuals, touch layout, audible music mix/ducking, flashing comfort and GPU/FPS are **not visually/audibly certified**. Light pulses are sinusoidal at 2 Hz and become constant under reduced motion; sound starts only after a gesture, fades by distance and has a separate stage slider. These behaviors are implemented but require device acceptance testing.


## Central stage / notices / movement speed 2
43/43 unit tests pass. The central platform is 16 × 8 (128 square units, formerly 60), with 17 tables and 102 seats outside the platform and ramp. Geometry coverage verifies all seat positions clear collision obstacles, all table centres are at least 8 units apart, all seats lie within the shared 30-unit audience radius, and a floor-graph flood from the entry reaches the stage via its ramp and approaches every seat. Server speed is exactly 2 units/s.

The seated camera action is local, preserves seating and automatically releases on standing or dragging. Perimeter notices contain the supplied under-18 sales restriction and no-driving-after-drinking messages, plus a request to keep order. Stage rendering and collision use shared speaker coordinates. Music fades across the enlarged audience area. Production build and the layout detector pass; visual/audio/device acceptance remains blocked by the saved localhost browser policy described above.

The updated three-client Socket.IO integration run passed through Vite :5173 with the central layout: real input movement to table 15 and up the relocated ramp, five completed drinks, two dancers, consent, a seated spectator vote, duplicate rejection, authoritative result and clean leave. The drink check waits for the received server patch with a bounded deadline instead of assuming that a fixed 150ms margin survives concurrent production builds. Raw result: `docs/results/social-live.json`.


## Street entrance / rear stage / WC / motorcycles / hiphop
45/45 unit tests and the production build pass. Fresh server-created guests spawn on the road (z=40..41.6), outside the gate at z=34. Movement through front fences, reception, bathroom walls/fixtures and parked bikes is blocked. The bathroom doorway stays walkable. All 102 chair positions clear obstacles and lie in front of the rear stage; floor-graph traversal from the road reaches every seat approach, reception, bathroom interior and both ramps. Ramp ascent/descent and solid platform edges are checked through authoritative movement. All 100 room arrivals remain on walkable road positions.

Hiphop, Krump and Running Man are validated through the real command handler. Full two-second pose sweeps retain finite matrices, fixed arm/leg bone lengths and at least one supporting foot, with distinct stronger foot lifts. Previous upright walking and mouth-contact sipping tests remain green. The layout detector reports no findings on the edited scene/venue/UI files. Visual/GPU/audio acceptance is still unverified because the saved browser policy blocks localhost; no browser workaround was used. Motorcycle geometry is original procedural scenery inspired by sport and step-through silhouettes, not licensed vehicle scans or a driving feature.

The updated three-client integration run passed against Vite :5173: road spawn, real movement through the gate, courtyard table interaction, left and right ramp ascent by separate dancers, simultaneous Hiphop/Krump, consented dance-off, voting from a courtyard seat, duplicate rejection, authoritative 20-second result, reset and clean leave. Raw report: `docs/results/social-live.json`. This is socket/logic evidence, not rendered browser evidence.


## Separated signs / ten-level recovery / crawling / smoking
52/52 unit tests pass and TypeScript/production build succeeds. New clock-controlled server tests cover 35 completed drinks with a capped level 10, all recovery boundaries through zero, unchanged lifetime count, delayed-tick event ordering, recovery across reconnect, no redundant sober patches, drift/speed limits, crawl collision, action restrictions and strict command rejection. Pose sweeps check low crawl posture, above-floor joints and fixed limb lengths; recovery restores upright posture. Smoking has finite duration, free-hand validation, movement cancellation, mouth-filter contact, fixed arm lengths, end-of-action hiding and no smoke puffs under reduced motion.

The rear duplicate shop title/motto seen in the supplied screenshot were removed; the entrance shop title and stage truss title have distinct locations. The layout detector returned no findings. Saved localhost browser policy still prevents a new rendered screenshot, GPU/audio acceptance or visual certification. The supplied screenshot is evidence of the reported overlap, not a rendered after-image.

Updated real Socket.IO integration passed with three TEST clients through Vite :5173. It confirmed automatic recovery to zero at the real server deadline while the total stayed at five, smoking effect delivery to another client, and walking cancelling smoking, alongside the prior entry/table/ramp/dance/vote checks. Raw result: `docs/results/social-live.json`. Maximum-level crawling/recovery uses controlled-clock server and rig tests, not a claim of rendered browser inspection.

## Compact names / level-gated vomiting
55/55 unit tests pass. New coverage checks level 4 rejection despite a high lifetime count, exact level 5 acceptance, free-hand validation, 4.2s duration, seated/crawling acceptance, cancellation on movement/recovery below 5 and unchanged counts/recovery deadlines. Full pose sweeps across levels 5/9/10, seated/standing and reduced motion verify finite matrices, constant hidden-bone lengths, forward bend, bounded droplets and end/ineligible hiding. Nameplate sizing is a source change based on the supplied screenshot; saved localhost browser policy still prevents a rendered after-image.

Production build and the layout detector pass. After restarting dev services, a two-client real Socket.IO check through Vite :5173 confirmed the new vomit command is recognized and rejected below level 5, ordinary gesture delivery still reaches an observer, and both clients leave cleanly. Eligible level 5–10 behavior is covered by the command/pose tests above; no new rendered-browser claim is made.

## Mouth-origin smoke exhale
56/56 tests pass. The added pose check verifies no exhale during inhalation, origin near the mouth and away from the lowered cigarette, forward/rising travel, disappearance by 4.8 seconds, and suppression under reduced motion for both seated and standing poses. Visual browser acceptance remains unverified under the previously recorded localhost policy.


## Eight characters / height and weight / running / receptionist
62/62 tests and production build pass. Coverage verifies legacy profile defaults, all appearance bounds and malformed input, caller-only changes/public patches/reconnect, exact 2.5 run speed and diagonal normalization, input timeout, collision/crawl enforcement and stronger drunk run drift. All 8×6 character/face combinations are measured at height/weight extremes; standing bounds match requested height within 1.5 cm, scaled mouth/rim contact remains exact, and seat/pelvis lifts agree. Running pose sweeps retain finite matrices and fixed hidden bone lengths. NPC tests check proximity, scripted facts/live vacancy count, no chat broadcast and no added player slot.

Two real socket clients passed through Vite :5173, labeled TEST: male/female extreme profiles, observer receiving an appearance update, invalid height rejection, running state, real input movement from the road to the receptionist, distant-chat rejection, private greeting/live seat reply and clean leave. Raw result: `docs/results/customization-live.json`. The layout detector returned no findings on edited components. Browser preview, touch layout, GPU/FPS and visual acceptance remain unverified under the saved localhost policy; no new 100-device graphics claim or load benchmark is made.


## Reception chat / blank screen regression
65/65 tests pass, including three new React DOM tests using jsdom (a unit DOM, not a controlled browser). Before the fix, simulating a Promise-returning `scrollIntoView` reproduced `TypeError: destroy is not a function` when the reception log updated, unmounting the UI. Reception scrolling now sets only its own container scrollTop in a block-bodied effect, so no scroll result can become a React cleanup. Actual input/change/submit events send a typed question, render the reply and send another without unmounting. Malformed/rejected RPC replies stay as local errors and a subsequent retry succeeds. A root GameBoundary test confirms an unexpected render error leaves a reload action instead of an empty game root.

The panel now shows the user's message immediately and an in-flight response status, validates the reply string before rendering and retains the draft after errors. No backend restart or intentional room reset is required. Saved browser policy still prevents direct inspection of the user's Chrome; the regression reproduces the lifecycle failure in an offline DOM test rather than claiming a new browser screenshot.

The production build and layout detector pass after the reception fix. The two-client live customization/run/reception test was rerun successfully against the still-running server; both private NPC replies arrived and clients left cleanly (`docs/results/customization-live.json`). No backend restart was performed for this frontend repair.


## Lying / durable suggestions
72/72 unit and DOM tests pass; production build and component layout scan pass. Coverage includes persistent lying/public patches, rise/movement exit, drink/seat/action constraints, flat-body clearance at walls/ramps/stage edges, crawl/reconnect behavior, all character/face/height/weight combinations above the floor, and preserved hidden-bone lengths. Feedback tests verify validation, one-minute throttling, retry after failed storage, serialized concurrent append/fsync, restart reads, 7/30-day counts and escaped report content. DOM submission tests retain the draft after errors and show success only after an acknowledged save.

The isolated live Socket.IO run used two TEST clients, port 3004 and a temporary DATA_DIR. It passed observer lying/stand updates, persisted-receipt identity, rate rejection, absence from chat, private file URL returning 404 and reading the saved entry after restarting that test server. All synthetic data was removed and never touched the production feedback store. Raw proof: `docs/results/rest-feedback-live.json`. The current owner report starts from actual data (zero at setup), with no seeded suggestions. Browser/GPU visual inspection remains unavailable under the recorded policy; Docker volume ownership is configured but not exercised here.


## N push-to-talk / native local LiveKit

77/77 unit and DOM tests pass. Five new voice client tests check release while connecting, permission grant after release, release during device setup, disconnect while waiting and permission timeout. These use mocked client rooms; they verify microphone intent/race handling, not browser keyboard events or the physical permission dialog. Source handlers share the same start/stop path for N and pointer buttons, ignore typing, and mute on release, pointer cancellation, focus loss/window blur and hidden tab.

A real LiveKit 1.13.11 native SFU runs locally alongside the dev server. `npm run test:voice` passed with three Socket.IO game sessions and three native RTC peers: road-to-seat input, zero initial token media rights, signed participant webhook authorization, a generated 440 Hz tone published and decoded at the same table (189 audio frames with nonzero samples), no subscribed track at the other table, unpublish removal and old-channel disconnect when a participant stands. No physical microphone was recorded. Raw proof: [results/voice-live.json](results/voice-live.json).

Mac local setup generates private keys, configures the signed webhook, binds SFU/RTC to 127.0.0.1 and starts it via `npm run dev`. Those keys and the original environment backup are excluded from Git/source bundles. Native execution avoids Docker Desktop host-network limitations; Linux Docker/Caddy deployment remains unverified here. Browser policy still prevents direct rendered/permission-dialog inspection; WAN/TURN, real microphones/speakers, six-device audio and SFU capacity remain unverified.

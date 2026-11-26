# Tự triển khai

## Chạy voice trên Mac hiện tại

Cần Node.js 22.12+ và Homebrew. Tạo `.env` từ `.env.example` nếu chưa có, chạy `npm run voice:local` một lần, rồi `npm run dev`. Setup cài LiveKit native nếu thiếu, tự sinh khóa bí mật và webhook local; đã chạy với LiveKit **1.13.11**. Không cần tài khoản Cloud. Dev chạy backend 3001, web 5173 và LiveKit 7880/RTC 7881 TCP, 7882 UDP. Voice chỉ lắng nghe tại 127.0.0.1 và dùng backend cổng 3001.

Mở `http://localhost:5173`, hai phiên độc lập ngồi cùng bàn. Bấm **Nghe bàn** để nghe, **giữ N** để nói, thả để tắt. Cho phép dùng micro khi hỏi. Trong ô chat, N chỉ gõ chữ. Điện thoại dùng nút giữ micro. Có nút bật/tắt nghe, âm lượng và tắt tiếng từng người riêng biệt.

`npm run test:voice` kiểm tra SFU và webhook thật bằng âm tổng hợp giữa ba RTC peer, không thu micro. Kiểm tra thiết bị/micro thực tế vẫn cần người dùng thử. Cấu hình local không dùng cho LAN hoặc Internet; dùng WSS/HTTPS và cấu hình SFU bên dưới cho các thiết bị khác.

Giữ riêng `.env`, `deploy/livekit.local.yaml`, `.runtime/.env.before-voice`; không đưa vào gói source hoặc chia sẻ. Bản sao lưu là cấu hình trước setup. Dừng dev trước khi đổi/khôi phục cấu hình, rồi khởi động lại; phòng game trong RAM sẽ mất. Script từ chối thay URL LiveKit ngoài máy để giữ cấu hình dịch vụ đã có.

## Lựa chọn dễ nhất: Node VPS + LiveKit Cloud

1. Thuê VPS Linux, cài Node 22.12+ hoặc Docker. Khởi đầu khoảng 2–4 vCPU, 4–8 GB RAM; phải đo lại theo workload, đây không phải cấu hình đã chứng nhận.
2. Đặt DNS A cho `quan.tenmien.vn`. Build `npm ci && npm run build`, dùng `npm start` dưới systemd hoặc Docker. Không chạy nhiều bản Node cùng sở hữu một mã phòng.
3. Reverse proxy Caddy/Nginx tới 127.0.0.1:3001, bật HTTPS và chuyển WebSocket. Caddy tự hỗ trợ WebSocket. Cổng 3001 không mở trực tiếp Internet.
4. `.env`: `ALLOWED_ORIGINS=https://quan.tenmien.vn`, `TRUST_PROXY=loopback`, LiveKit URL/key/secret lấy trong dự án LiveKit của bạn. URL dạng `wss://…livekit.cloud`.
5. Trong LiveKit, thêm webhook URL `https://quan.tenmien.vn/api/livekit/webhook`, chọn cùng API key ký webhook, bao gồm sự kiện `participant_joined` (có thể gửi tất cả sự kiện). Chưa bật ghi âm/egress/STT.
6. Đặt `LIVEKIT_WEBHOOK_ENABLED=true`, restart Node. Không bật trước khi kiểm tra webhook có chữ ký thực sự đến được endpoint.
7. Tạo quán, ngồi hai thiết bị vào cùng bàn, bấm **Nghe bàn**, giữ **N** để nói, thả để tắt mic. Thử đổi bàn, mất mạng, kick và expired token. Khi webhook không đến, participant không có quyền media; không nới quyền token để chữa tạm.

Không đặt khóa SFU/TURN trong biến `VITE_*`, source frontend, link mời hay ảnh chụp màn hình. Không commit `.env` hoặc cert private key.

## Tự host LiveKit trên Linux bằng Docker Compose

Các tệp `compose.yaml`, `deploy/livekit.example.yaml`, `deploy/Caddyfile` là cấu hình khởi điểm **chưa được chạy Docker tại môi trường bàn giao**.

1. Chuẩn bị 2 DNS A: `quan.tenmien.vn` và `voice.tenmien.vn` cùng IP VPS; mở firewall 80/TCP, 443/TCP, 7881/TCP, 3478/UDP, 50000–50100/UDP. Không mở 7880/3001 trực tiếp.
2. Sao chép `.env.example` thành `.env`, đặt GAME_DOMAIN/VOICE_DOMAIN, ALLOWED_ORIGINS=`https://quan.tenmien.vn`, LIVEKIT_URL=`wss://voice.tenmien.vn`.
3. Sao chép `deploy/livekit.example.yaml` thành `deploy/livekit.yaml` (đã gitignore). Tạo key và secret ngẫu nhiên mạnh (ví dụ `openssl rand -hex 32`). Chép cùng key/secret vào `.env` và mục `keys`/`webhook.api_key` trong `deploy/livekit.yaml`. Thay `turn.domain` thành domain voice. Đây là cấu hình máy chủ, không gửi browser.
4. Bật LIVEKIT_WEBHOOK_ENABLED=true. Compose dùng host networking **Linux**; webhook localhost đi từ SFU sang Node. Caddy cấp chứng chỉ HTTPS cho 2 domain.
5. Chạy `docker compose up -d --build`. Kiểm tra `docker compose logs --tail=100 game livekit caddy`, `/api/health` có voiceConfigured=true, webhook thành công và 2 thiết bị trao đổi audio thật.
6. Self-host không Redis: một node SFU cho v1. `room.max_participants=6`; không có egress recorder. Game 100 người chia 17 kênh, không room voice 100 người.

TURN UDP 3478 trong mẫu giúp NAT thường. Mạng chặn UDP cần TURN/TLS: lấy chứng chỉ CA hợp lệ cho VOICE_DOMAIN, đặt fullchain.pem/privkey.pem trong `deploy/certs` (không commit), bật `turn.tls_port:5349`, `cert_file`, `key_file`; mở 5349/TCP. Cài lịch gia hạn chứng chỉ và restart SFU sau thay cert. 7881/TCP là ICE TCP trực tiếp; không phải thay thế hoàn toàn TURN/TLS ở mọi mạng. Mạng chỉ cho 443 có thể cần TURN dịch vụ riêng cổng 443 hoặc bộ cân bằng TLS/layer4; Caddy HTTP mặc định không proxy TURN. Nếu không có kinh nghiệm vận hành WebRTC, dùng relay do LiveKit Cloud cung cấp.

Mac/Windows Docker Desktop không tương đương host network Linux; dùng LiveKit dev native hoặc Cloud cho phát triển. Cấu hình local WS và webhook URL phải trỏ được backend thật. Không tắt kiểm tra TLS để chữa lỗi.

## Chi phí theo giả định, không phải báo giá

- VPS game 2–4 vCPU/4–8 GB: ngân sách dự trù khoảng **15–40 USD/tháng**, tùy vùng/nhà cung cấp; chưa gồm domain, thuế và lưu lượng vượt gói. Nếu SFU cùng VPS, cần đo CPU/network và có thể cần máy lớn hơn.
- Với 100 người voice trong 1 giờ: khoảng **6.000 participant-minutes**. 100 người đều phát 32 kbit/s → SFU ingress khoảng **3,2 Mbit/s**; mỗi người nghe tối đa 5 luồng → egress khoảng **16 Mbit/s ≈7,2 GB/giờ**, chưa tính RTP/DTLS/TURN overhead. Dự trù thêm 30–50% tùy codec và mạng. Đây là tính toán, không phải số đo thực tế.
- Nếu đồng thời phát 25%, egress payload khoảng 1,8 GB/giờ cùng quy mô kết nối. TURN thêm lưu lượng relay; tính theo cách nhà cung cấp đo.
- LiveKit Cloud tính usage/hạn mức theo gói hiện hành. Kiểm tra concurrency ≥100, participant minutes, GB outbound/relay, vùng và webhook/API rate limit trong tài khoản; **không giả định free tier đáp ứng**. Không tích hợp thanh toán Cloud hay tự đăng ký dịch vụ trong mã.
- Nhạc/sfx tạo trên máy khách không tốn băng thông audio máy chủ. Không lưu bản ghi audio, không có phí ghi âm.

## Vận hành và rollback

Bật LOG_METRICS=true để có RSS, heap, CPU tích lũy, event-loop p99, byte snapshot và packet/s; không log session bearer. Đặt cảnh báo restart, lỗi webhook/thu hồi kênh SFU và lỗi socket ở lớp giám sát bạn chọn. Không công khai log hay endpoint debug chứa state.

`npm ci` dùng lockfile. Mỗi lần phát hành build image có tag theo commit, lưu image trước đó. Rollback image game/SFU theo tag; restart game làm mất toàn bộ phòng hiện tại, nên thông báo bảo trì. V1 chưa có khôi phục phòng; không gắn volume hay Redis rồi tuyên bố có persistence.


## Lưu và đọc góp ý người chơi

`DATA_DIR=data` mặc định, nằm ngoài dist/public. Node cần quyền ghi thư mục này. File canonical là `feedback.jsonl`; chỉ xác nhận gửi sau append/fsync. Sao lưu thư mục dữ liệu riêng với mã nguồn; phòng vẫn là bộ nhớ tạm nhưng góp ý đã lưu không mất sau restart.

Chạy trực tiếp trên máy chủ:

```sh
npm run feedback:report
```

Mở `artifacts/gop-y-nguoi-choi.html` để xem nhóm quan tâm trong 7/30 ngày và nội dung mới nhất. Chạy lại lệnh mỗi khi cần tổng hợp mới. Báo cáo và dữ liệu không được phục vụ công khai qua ứng dụng.

Compose đã mount named volume `game_data` tại `/app/data`, tạo thư mục thuộc user node và có lệnh báo cáo trong runtime image. Để lấy báo cáo về host:

```sh
docker compose exec game npm run feedback:report
docker compose cp game:/app/artifacts/gop-y-nguoi-choi.html ./artifacts/gop-y-nguoi-choi.html
```

Trong cấu hình Compose mặc định, giữ `DATA_DIR=data` (hoặc `/app/data`) để dùng đúng volume. Thư mục artifacts trên host cần tồn tại trước khi copy. Phần này không gửi email/Slack và không yêu cầu tài khoản dịch vụ bên ngoài.

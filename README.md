# Quán Nhậu Đầu Hẻm

Game 3D nhiều người chơi trên trình duyệt. React + Three.js, Socket.IO, Node.js và voice LiveKit theo bàn. Nhân vật, mô hình quán và nhạc được tạo trong mã; bề mặt dùng texture PBR CC0 lưu kèm dự án. Không có khách giả trong game.

## Chạy ngay trên máy

Cần Node.js 22.12+ (đã build/test bằng Node 26). Từ thư mục dự án:

```sh
npm ci
cp .env.example .env
npm run dev
```

Mở http://localhost:5173. Nhập biệt danh → **Mở quán** → **Mời bạn**. Mở cửa sổ trình duyệt thứ hai bằng link mời, nhập biệt danh khác và vào bằng mã. Mỗi tab có phiên khách riêng trong sessionStorage; hãy mở tab mới độc lập, không nhân bản tab đang chơi nếu muốn một người mới.

- Người mới vào phòng xuất hiện ngoài đường trước cổng. Đi qua cổng, cạnh quầy lễ tân để vào sân bàn nhậu; sân khấu ở cuối sân, WC ở góc cuối bên trái. Xe máy trang trí kiểu Xì-po/Dream đỗ ngoài đường.
- WASD / mũi tên: đi lại. Kéo trên cảnh: xoay camera. Cuộn: thu phóng.
- E: ngồi ghế gần nhất / đứng dậy. Đến ghế trước, không dịch chuyển tức thời.
- Điện thoại: joystick, vuốt camera và nút tương tác.
- Ngồi vào bàn để gọi món, Dô, chơi Ai tới lượt? và dùng voice.
- **Giữ N để nói, thả N để tắt mic**; hoặc giữ nút micro trên màn hình. Chỉ xin quyền micro khi bạn bắt đầu nói. Gõ N trong ô chat không bật mic; đổi cửa sổ/ẩn tab sẽ tắt mic.
- Mic tắt mặc định; **Nghe bàn** nối kênh nhưng không mở micro.

Bản chạy mặc định có multiplayer thật trên cùng máy. Muốn nhiều thiết bị trong LAN: thêm `http://<IP-máy-chủ>:5173` vào ALLOWED_ORIGINS trong `.env`, khởi động lại, rồi mở địa chỉ đó trên thiết bị khác. Voice trên thiết bị khác cần HTTPS hoặc localhost; HTTP IP LAN không đủ quyền micro.

## Voice theo bàn

Trên Mac có Homebrew, chạy một lần sau khi tạo `.env`:

```sh
npm run voice:local
npm run dev
```

Lệnh đầu cài LiveKit native nếu thiếu, sinh khóa riêng và cấu hình webhook. Lệnh dev chạy cả game, web và LiveKit. Mở **http://localhost:5173**, ngồi cùng bàn, bấm **Nghe bàn** để nghe; giữ **N** để nói và cho phép dùng micro khi trình duyệt hỏi. Giữ N cũng tự nối kênh nếu chưa nối. Điện thoại dùng nút **Giữ để nói**. Mic mặc định tắt, thả nút/phím sẽ tắt cả khi kết nối hoặc quyền micro đến muộn.

Cấu hình local chỉ dùng trên máy này: WS 7880, RTC TCP 7881/UDP 7882 đều bind localhost. Không dùng cấu hình này cho thiết bị khác hoặc Internet. `.env`, `deploy/livekit.local.yaml` và bản sao lưu trong `.runtime` chứa khóa riêng, đã loại khỏi Git/gói mã nguồn. Script không ghi đè URL LiveKit ngoài máy; nếu đã có dịch vụ ngoài, giữ cấu hình đó. Dừng dev trước khi chạy lại setup; cấu hình local này dùng backend cổng 3001.

Game/chat không phụ thuộc voice. Bản sao mã nguồn mới chưa chạy setup sẽ báo **chưa cấu hình**. Khi một người rời bàn, kênh bàn đổi thế hệ để thu hồi cả token cũ; người còn lại tự nối lại với micro tắt. Xem [hướng dẫn LiveKit và triển khai Internet](docs/DEPLOYMENT.md).

Cần LIVEKIT_URL, API key/secret và **webhook participant_joined** có chữ ký. Chỉ bật `LIVEKIT_WEBHOOK_ENABLED=true` sau khi webhook đã hoạt động. Token ban đầu không có quyền nghe/phát; máy chủ kiểm tra lại ghế từ webhook rồi mới mở quyền media. Secret chỉ ở backend.

## Build và chạy production

```sh
npm run build
npm start
```

Frontend build nằm trong `dist/`; Node phục vụ cả frontend, `/socket.io` và API trên cổng 3001. Cấu hình origin công khai chính xác và đặt sau HTTPS. Không cần tách hai dịch vụ frontend/backend ở bản đầu.

## Kiểm thử

```sh
npm test
npm run check
npm run build
npm run test:load
```

Sau khi voice local và dev đang chạy, `npm run test:voice` tạo ba client TEST trong quán riêng và truyền âm tổng hợp qua SFU thật. Kiểm tra cùng bàn nhận audio, bàn khác không nhận, rời bàn thu hồi kênh. Không thu micro vật lý. Kết quả: `docs/results/voice-live.json`.

`test:load` tự mở máy chủ test riêng tại 127.0.0.1:3002 rồi đóng nó. Tạo **100 bot được đánh dấu [BOT TẢI]**, đi bằng input thật, thử ngồi/gọi món/chat/cụng ly/mini game; phiên 101 bị từ chối. Không dựng 100 cảnh 3D, không gửi audio. Báo cáo ghi ở `docs/results/load.json`. Đây là tải mô phỏng trên một máy, không chứng minh 100 người trên thiết bị thật hay sức chứa SFU. Có thể đổi `LOAD_SECONDS=120 npm run test:load`.

Xem [kết quả và phần chưa kiểm chứng](docs/TESTING.md), [kiến trúc và bất biến](docs/ARCHITECTURE.md), [tài sản và giấy phép](docs/ASSETS.md).

## Giới hạn quan trọng

- Một tiến trình sở hữu tất cả phòng; phòng/phiên mất khi khởi động lại. Chưa có lưu trữ, khôi phục hay mở rộng ngang.
- 100 là giới hạn máy chủ mỗi phòng, **không phải cam kết đã phục vụ 100 người thật**. Cần kiểm tra GPU trên điện thoại, mạng Internet và SFU riêng trước vận hành.
- Chưa thử voice 6 thiết bị thật / TURN trên mạng hạn chế; cần dịch vụ và cấu hình của bạn.
- Bộ mô hình là low-poly nguyên thủy, không dùng tài sản có bản quyền bên ngoài. Camera raycast vật cản tĩnh và giới hạn tầm nhìn; cần kiểm tra trực quan thêm ở thiết bị đích.
- Chỉ có donation QR tĩnh về tài khoản đã cho; không đối soát hay xác nhận nhận tiền.
- Không có tài khoản: mời ra chỉ chấm dứt phiên hiện tại, không phải cấm vĩnh viễn người dùng.

## Bản cập nhật đồ họa và cử chỉ
Bê tông, tường vôi, đường nhựa và tôn dùng ảnh bề mặt PBR; bàn inox có phản xạ, ly có bia/bọt/quai, cây có lá. Camera thấp và gần nhân vật hơn. Nhân vật có vai–khuỷu, hông–gối, bước chân theo quãng đường; tốc độ đi 2 đơn vị/s. Bấm Dô khi ngồi sẽ lấy ly, nâng/đưa ly ra bàn rồi đặt lại (3,6 giây). Người khác thấy cùng cử chỉ; đây là bia ảo. Giảm chuyển động vẫn giữ bước chân, giảm lắc thân/đầu.

Dáng đứng được chỉnh thẳng: chân và tay gần duỗi khi nghỉ, tay buông xuống cạnh thân. Hông theo chân đỡ, chân kia gập vừa đủ để bước; không giữ dáng ngồi xổm khi đứng/đi.

## Nhân vật, chạy và lễ tân

- Trước khi vào quán: mở **Chọn nhân vật** dưới biệt danh. Có **8 mẫu (4 nam, 4 nữ)**, 6 kiểu mặt, màu áo, chiều cao **1,00–2,00 m** và cân nặng **40–150 kg**. Khung 3D xem trước cho phép kéo xoay. Vóc dáng thay đổi theo cân nặng; đây là tùy chỉnh tạo hình, không mô phỏng sinh lý hay đổi lợi thế va chạm.
- Trong quán: bấm biểu tượng **Nhân vật** ở thanh trên, chỉnh rồi **Lưu tạo hình**. Mọi người cùng thấy thay đổi, phiên nối lại giữ tạo hình. Lựa chọn cũng lưu trên thiết bị. Ghế có người được nâng theo tầm vóc để giữ tư thế ngồi và tầm mặt bàn; ly vẫn tiếp xúc miệng khi uống.
- Đi bộ **2**; giữ **Shift** hoặc bật nút **Chạy** để chạy **2,5 đơn vị/s**, trên điện thoại dùng nút Chạy với joystick. Say chạy sẽ lệch hướng và lắc người mạnh hơn; cấp 10 vẫn chỉ bò **0,6**, không thể dùng chạy để vượt giới hạn. Nhả Shift/tắt Chạy để đi thường.
- **Hạnh · Lễ tân NPC** đứng tại quầy cạnh cổng. Đến gần quầy, bấm **Lễ tân NPC** bên trái để chào hỏi hoặc gõ câu hỏi về bàn còn chỗ, món ăn, WC, sân khấu và cách chơi. Đây là trả lời theo kịch bản, không phải trợ lý AI mở; không cần API key. Hội thoại riêng chỉ hiện cho bạn, không gửi vào chat quán. NPC không chiếm chỗ trong 100 phiên và không giữ ghế thay bạn.
- `node --import tsx tests/customization-live.ts`: kiểm tra hai client socket về tạo hình, chạy thật từ đường tới quầy và hội thoại NPC. Báo cáo: `docs/results/customization-live.json`.

## Nằm nghỉ và góp ý người chơi

- **Cử chỉ → Nằm nghỉ**: đứng ở chỗ trống bằng phẳng, cất cốc trước khi nằm. Nhân vật nằm ngửa nghỉ, người khác cùng thấy. Nhấn **Đứng dậy**, **E** hoặc di chuyển để dậy; nếu vẫn say cấp 10 sẽ trở về bò. Nằm không làm tỉnh nhanh hơn, không chiếm ghế và giữ trạng thái khi nối lại phiên.
- Nút **Góp ý** trên thanh trên cho người đang chơi gửi Ý tưởng, Báo lỗi, Đồ họa/nhân vật, Điều khiển/lối chơi, Giao lưu/âm thanh hoặc Khác. Nội dung 10–1.000 ký tự, tối đa một góp ý/phút mỗi phiên. Chỉ báo thành công sau khi máy chủ đã lưu. Nếu lỗi lưu/kết nối, nội dung vẫn còn để gửi lại.
- Góp ý lưu riêng ở **`data/feedback.jsonl`** (đổi bằng `DATA_DIR`), kèm biệt danh, mã quán, thời gian; không đăng vào chat hoặc công khai qua web. Phòng đóng/máy chủ khởi động lại không xóa các góp ý đã lưu.
- Chủ game chạy **`npm run feedback:report`**, rồi mở **`artifacts/gop-y-nguoi-choi.html`**. Báo cáo đếm nhóm trong 7 ngày, 30 ngày, toàn thời gian và hiển thị 100 góp ý mới nhất. Chạy lại lệnh để cập nhật; không tự tạo dữ liệu mẫu và không tính là số người duy nhất.
- `node --import tsx tests/rest-feedback-live.ts` kiểm tra hai client thật trên máy chủ test riêng và thư mục tạm, không trộn góp ý TEST vào dữ liệu người chơi.

## Giao lưu, sân khấu và say ảo

- Tốc độ đi hiện tại **2 đơn vị/s**. Đến gần bàn/quầy → **Cầm cốc** → đứng dậy, đi tới bàn có người → **Cử chỉ → Mời bàn N**. Bấm **Dô!** để uống tại chỗ. Di chuyển hủy lần uống dở và không cộng cốc.
- Cử chỉ: vẫy tay, vỗ tay, gật đầu, lắc đầu, **Nôn** (4,2 giây, cần say cấp 5 trở lên), **hút thuốc lá ảo** (4,8 giây). Cất cốc trước khi hút thuốc/vỗ tay/nhảy; hút thuốc đưa điếu lên miệng, hạ tay rồi nhả khói từ miệng; khói bay ra trước, nở nhẹ và tan dần, đi lại sẽ dừng cử chỉ. Đang cầm cốc thì vẫy bằng tay còn lại.
- Điệu nhảy: Shuffle, Disco, Robot, Lắc lư, **Hiphop, Krump, Running Man**. Ba điệu mới có nhún sâu, nâng gối/kéo chân và đánh tay mạnh theo nhịp. Nhấn di chuyển hoặc **Dừng nhảy** để dừng. Không cần uống mới được nhảy.
- **Sân khấu** rộng 16 × 8 ở cuối sân, phía sau toàn bộ 17 bàn; có **hai dốc lên/xuống hai bên**, nút Sân khấu đánh dấu dốc gần hơn. Nhân vật tự đi lên, không dịch chuyển tức thời. Khi ngồi, mở **Sân khấu → Xem sân khấu từ ghế** để hướng camera về sân khấu; kéo cảnh để trở lại góc nhìn tự do. Có loa, đèn màu nháy nhẹ theo nhịp, nhạc điện tử 120 BPM do mã tự tổng hợp. Chỉnh riêng âm lượng Nhạc sân khấu trong cài đặt; bật Giảm chuyển động để đèn đứng yên.
- Hai người trên sân khấu, không cầm cốc: rủ so tài → đối phương nhận lời trong 12s → nhảy 20s. Khán giả trong 48 bước bình chọn một lần mỗi phiên/lượt, không tự chọn mình. Hòa khi bằng phiếu; rời sân khấu/dừng nhảy hủy lượt. Đây là bình chọn vui, không điểm thưởng, tiền cược hoặc xác minh danh tính người thật.
- Máy chủ chỉ cộng **cốc bia ảo đã uống xong**. Lượng say còn lại bắt đầu ở 5, mỗi 3 cốc thêm một cấp; **tối đa cấp 10**. Mức 1 đỏ mặt; mức 2–9 lắc lư và đi loạng choạng tăng dần, chậm dần. Mức 10 khi đứng sẽ **bò bằng tay và gối ở 0,6 đơn vị/s**, chưa thể cầm cốc/nhảy/dùng cử chỉ đứng khác; vẫn có thể ngồi nghỉ hoặc dùng **Nôn**. Khi hồi về mức 9 sẽ đứng đi lại.
- **Không uống thêm trong 60 giây: giảm một cấp**, tiếp tục giảm mỗi 60 giây đến hết say. Uống xong một cốc mới đặt lại thời gian chờ. Tổng số cốc giữ nguyên khi tỉnh tự nhiên; số cốc và lượng say là hai giá trị riêng. Panel Cử chỉ hiển thị mức /10 và thời gian hồi phục tiếp. **Đặt lại hiệu ứng say** vẫn xóa cả tổng cốc và lượng say của chính bạn. Nối lại phiên không xóa lịch hồi phục. Giảm chuyển động giữ động tác bò cần thiết, giảm lắc thân/đầu và tắt các cụm khói.

- `node --import tsx tests/social-live.ts`: kiểm tra chức năng với 3 client socket qua server dev đang chạy, trong một phòng riêng. Mọi client mang nhãn TEST. Báo cáo tại `docs/results/social-live.json`; không phải kiểm tra trình duyệt/âm thanh thực tế.

Biển men cảnh báo trên tường quán: **Không bán rượu bia cho người dưới 18 tuổi**, **Đã uống rượu bia thì không lái xe**, và nhắc giữ trật tự.

Biển tên quán chính nằm ở cổng. Phía sau chỉ giữ biển sân khấu, bỏ hai biển lặp từng chồng lên nhau trong ảnh người dùng.

**Cử chỉ → Nôn · Say cấp 5+**: cất cốc trước khi dùng. Nhân vật cúi người với vài giọt hiệu ứng đơn giản; dùng được khi đứng, ngồi hoặc đang bò. Di chuyển hoặc hồi xuống dưới cấp 5 hủy cử chỉ. Đây chỉ là cử chỉ, không xóa cốc hoặc làm tỉnh nhanh hơn. Bảng tên được thu gọn để cân với nhân vật.

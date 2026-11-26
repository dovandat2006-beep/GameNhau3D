Hãy lập trình web game 3D nhiều người chơi tên **“Quán Nhậu Đầu Hẻm”**, chạy trực tiếp trên trình duyệt, lấy bối cảnh quán nhậu vỉa hè Việt Nam thời xưa.

Tôi cần mã nguồn và bản game chơi được, có multiplayer thật, voice chat và nhạc nền. Không dừng ở trang giới thiệu, giao diện tĩnh hoặc nhân vật giả.

## 1. Ý tưởng và phạm vi

Người chơi bước vào một quán nhậu đầu hẻm, điều khiển nhân vật đi lại, tìm bàn, ngồi cùng bạn bè, gọi món, chat chữ, nói chuyện bằng micro và chơi trò vui.

Quy định sức chứa:
- **Mỗi phòng/quán tối đa 100 người kết nối đồng thời**, tính cả người đang đi lại và đang ngồi.
- Mỗi bàn tối đa **6 người**.
- Có **17 bàn**, tương đương 102 ghế; giới hạn người thực tế trong phòng vẫn là 100.
- Có thể tạo nhiều phòng độc lập. Không hiểu 100 là giới hạn cho toàn bộ hệ thống.
- Tạo phòng riêng hoặc tham gia phòng công khai còn chỗ.
- Phòng đầy phải thông báo rõ và cho chọn phòng khác, không tự tạo hàng chờ trong bản đầu.

Ưu tiên hoàn thiện một quán hoạt động ổn định trước khi mở rộng tính năng.

## 2. Hướng hình ảnh và ảnh tham khảo

Dùng ảnh tham khảo đính kèm để hiểu:
- Khung cảnh 3D toàn màn hình.
- Nhân vật nhỏ, camera góc nhìn thứ ba từ phía sau.
- Người chơi tự đi lại trong không gian.
- Các nút điều khiển nổi gọn tại góc màn hình và phía dưới.

Thay bối cảnh ngôi chùa bằng quán nhậu vỉa hè Việt Nam. Tự tạo hoặc dùng tài sản có quyền sử dụng phù hợp; không sao chép tài sản của website tham khảo.

Phong cách 3D stylized, nhân vật chibi, môi trường có chiều sâu, vật liệu và tỉ lệ thống nhất.

## 3. Không khí Việt Nam xưa

Lấy cảm hứng từ khu phố Việt Nam khoảng thập niên 1990 đến đầu những năm 2000.

**Bố cục quán:**
- Quán nằm trước căn nhà cũ, trải dọc vỉa hè và một đoạn hẻm.
- Chia 17 bàn thành các cụm có lối đi rõ ràng, tránh cảm giác hội trường.
- Có cửa vào, quầy phục vụ và khu vực đứng chờ.
- Biển bàn đánh số dễ nhìn để bạn bè tìm nhau.
- Bố trí đủ rộng cho nhân vật và camera di chuyển.

**Chi tiết:**
- Tường vôi vàng bạc màu, cửa sắt kéo, mái tôn, mái bạt.
- Bảng hiệu sơn tay “Quán Nhậu Đầu Hẻm”.
- Bảng thực đơn viết phấn.
- Bàn inox, ghế nhựa thấp đỏ hoặc xanh.
- Thùng đá, sọt rác, hộp đũa, chén nhỏ, lọ tăm.
- Ly thủy tinh dày, đĩa thức ăn, chai bia và nước ngọt dùng nhãn hư cấu.
- Quạt máy cũ, radio, xe đạp hoặc xe máy đời cũ.
- Một vài chậu cây và đồ vật sinh hoạt đặt hợp lý.

**Ánh sáng:**
- Buổi tối đầu giờ, bầu trời xanh sẫm.
- Ánh đèn vàng hắt từ quán ra vỉa hè.
- Màu sắc hoài niệm, bóng đổ mềm, đường đi dễ nhìn.
- Không dùng cyberpunk, đèn neon rực hoặc nội thất sang trọng.

Không nhồi chi tiết trang trí làm giảm hiệu năng hoặc cản trở tương tác.

## 4. Vào game và quản lý phòng

Màn hình đầu:
- Nhập biệt danh.
- Chọn avatar và màu áo.
- “Mở quán”: tạo phòng công khai hoặc riêng.
- “Vào bằng mã”: nhập mã phòng.
- “Tìm quán”: danh sách phòng công khai và số người thực tế.

Không bắt buộc đăng ký tài khoản trong bản đầu.

Sau khi vào:
- Nhân vật xuất hiện tại vị trí hợp lệ ở cửa quán.
- Có hướng dẫn điều khiển ngắn.
- Hiển thị tên phòng, mã phòng, số người dạng “37/100”.
- Có nút sao chép link mời.
- Link mời không chứa thông tin xác thực riêng của người chơi.

Máy chủ phải cấp chỗ trong phòng một cách nguyên tử để nhiều người vào cùng lúc không vượt 100.

Xử lý phòng không tồn tại, phòng đầy, lỗi kết nối và tải tài sản thất bại. Khi chủ phòng rời hẳn, chuyển quyền theo quy tắc rõ ràng.

## 5. Nhân vật và điều khiển

Nhân vật chibi mặc áo thun, sơ mi, quần dài, dép hoặc trang phục đời thường phù hợp bối cảnh.

Hoạt ảnh:
- Đứng yên.
- Đi bộ.
- Ngồi.
- Nâng ly.
- Vẫy tay.

**Máy tính:**
- WASD hoặc phím mũi tên để di chuyển.
- Kéo chuột xoay camera.
- Cuộn chuột chỉnh khoảng cách trong giới hạn.
- Phím E tương tác.
- Không di chuyển nhân vật khi đang nhập chat.

**Điện thoại:**
- Joystick cảm ứng.
- Vuốt vùng trống xoay camera.
- Nút tương tác đủ lớn, không chồng lên chat.

Có va chạm với bàn, tường và vật cản. Camera tránh xuyên đồ vật, không rung hoặc thay góc đột ngột.

Hiển thị biệt danh trên đầu nhân vật gần người chơi; giảm hoặc ẩn nhãn ở xa để tránh rối khi đông người.

## 6. Ngồi bàn và hiện diện

- Đến gần ghế trống thì hiện “Ngồi vào bàn”.
- Máy chủ kiểm tra khoảng cách và trạng thái ghế trước khi chấp nhận.
- Một ghế chỉ có một người, một người chỉ ngồi một ghế.
- Nhân vật ngồi đúng vị trí và hướng.
- Có nút “Đứng dậy”, đưa nhân vật ra vị trí an toàn.
- Không cho ngồi thêm khi bàn đủ 6 người.
- Người chơi có thể chuyển bàn.
- Có bảng tìm bàn hiển thị số ghế còn trống và số bàn; chọn bàn sẽ chỉ đường, không tự dịch chuyển trong bản đầu.

Khi mất kết nối:
- Hiển thị trạng thái kết nối lại.
- Giữ phiên và ghế trong một khoảng chờ ngắn, có giới hạn rõ.
- Người nối lại không bị tạo thêm nhân vật.
- Người đang giữ phiên trong thời gian chờ vẫn tính vào giới hạn 100.
- Hết thời gian chờ thì giải phóng chỗ, ghế và kết nối voice.

## 7. Multiplayer cho 100 người

Multiplayer phải hoạt động giữa nhiều thiết bị thật.

Đồng bộ:
- Vị trí, hướng và hoạt ảnh.
- Trạng thái ngồi/đứng.
- Người vào/rời phòng.
- Món ăn trên bàn.
- Cụng ly và biểu cảm.
- Trạng thái mini game.

Thiết kế để tránh gửi mọi cập nhật cho toàn bộ 100 người:
- Dùng phân vùng không gian hoặc cơ chế interest management cho chuyển động và sự kiện cục bộ.
- Người ở gần được cập nhật thường xuyên hơn; người ở xa dùng mức cập nhật thấp hơn khi phù hợp.
- Giữ dữ liệu tổng quan phòng và bàn chính xác.
- Dùng nội suy cho nhân vật từ xa.
- Có giới hạn tần suất gửi và kích thước dữ liệu.
- Không phát tọa độ theo từng khung hình đến toàn phòng.
- Không gửi luồng voice của cả quán cho từng người.

Máy chủ quyết định trạng thái quan trọng, kiểm tra tốc độ và tính hợp lệ của chuyển động, quyền tương tác, sức chứa và kết quả trò chơi.

Không coi 100 nhân vật đứng yên hoặc 100 kết nối socket rỗng là bằng chứng đáp ứng 100 người chơi hoạt động.

## 8. Chat chữ

Có hai kênh:
- Chat quán.
- Chat bàn, chỉ dành cho người đang ngồi cùng bàn.

Yêu cầu:
- Hiển thị tên người gửi và kênh rõ ràng.
- Bong bóng thoại ngắn trên đầu nhân vật, chỉ hiện trong phạm vi phù hợp.
- Có thể thu gọn chat.
- Giới hạn độ dài và tần suất.
- Hiển thị nội dung an toàn, không thực thi HTML.
- Có tắt tiếng/chặn tin nhắn của từng người trên thiết bị.
- Có quyền chủ phòng mời người gây rối ra khỏi phòng, được máy chủ kiểm tra.
- Người bị mời ra phải bị ngắt cả game lẫn voice; không tuyên bố chặn vĩnh viễn người chơi khách nếu chưa có cơ chế danh tính phù hợp.

## 9. Gọi món và cụng ly

Thực đơn:
- Đậu phộng.
- Nem chua.
- Mực nướng.
- Đậu hũ chiên.
- Bia ảo.
- Nước ngọt.
- Trà đá.

Người đang ngồi được mở thực đơn và gọi món cho bàn mình:
- Món xuất hiện tại các vị trí định sẵn.
- Mọi người cùng bàn nhìn thấy cùng trạng thái.
- Giới hạn số món để tránh chồng lấn.
- Có thao tác dọn món với quy tắc quyền rõ ràng.
- Không cần tiền ảo, thanh toán món hoặc mô phỏng nhân viên trong bản đầu.

Bấm “Dô!” để nâng ly, phát tiếng chạm ly và hiệu ứng ngắn cho bàn. Giới hạn tần suất để tránh spam.

Mọi đồ uống là vật phẩm ảo. Không yêu cầu hoặc gây áp lực uống rượu bia thật.

## 10. Mini game “Ai tới lượt?”

Triển khai một trò hoàn chỉnh:
- Dành cho tối đa 6 người cùng bàn.
- Máy chủ xác định người điều phối bàn.
- Mỗi bàn chỉ có một lượt đang chạy.
- Máy chủ chọn ngẫu nhiên một thành viên đang ngồi tại bàn.
- Mọi thành viên thấy cùng kết quả và câu hỏi.
- Có ít nhất 20 câu hỏi tiếng Việt tự viết, vui và lành mạnh.
- Có “Câu khác”, “Bỏ qua”, “Kết thúc lượt”.
- Xử lý người được chọn hoặc điều phối viên rời bàn giữa lượt.
- Người ở bàn khác không điều khiển được trò chơi.
- Không cá cược, không phạt uống bia, không thử thách nguy hiểm hoặc làm nhục.

## 11. Voice chat theo bàn

Triển khai voice chat thật bằng WebRTC qua SFU, ưu tiên LiveKit hoặc giải pháp tương đương.

**Phạm vi:**
- Mỗi bàn là một kênh thoại riêng, tối đa 6 người.
- Chỉ người đang ngồi cùng bàn được nghe/nói với nhau.
- Người đang đi lại dùng chat chữ; chưa có voice toàn quán hoặc voice theo khoảng cách trong bản đầu.
- Rời bàn, đổi bàn hoặc rời phòng phải ngắt kênh cũ.
- Không chỉ ẩn giao diện: máy chủ phải thu hồi quyền và ngắt thành viên khỏi kênh thoại cũ.
- Kiểm tra lại trạng thái ghế trước khi cấp quyền vào kênh mới.

**Điều khiển:**
- Micro mặc định tắt.
- Chỉ xin quyền micro khi người chơi bấm “Bật mic”.
- Có bật/tắt mic và bật/tắt nghe riêng biệt.
- Có nhấn giữ để nói trên máy tính và nút tương ứng trên điện thoại.
- Hiển thị trạng thái đang nói, tắt mic hoặc lỗi.
- Có chỉnh âm lượng voice và tắt tiếng từng người.
- Dùng khử vọng, giảm tiếng ồn, tự điều chỉnh âm lượng khi trình duyệt hỗ trợ.

**Bảo mật và kết nối:**
- Backend cấp token ngắn hạn, gắn đúng người, phòng và bàn.
- Không để trình duyệt tự chọn kênh trái quyền.
- Không nhúng khóa SFU/TURN dài hạn vào frontend.
- Cấu hình STUN/TURN hoặc dịch vụ relay do nhà cung cấp hỗ trợ.
- Giải phóng micro và kết nối khi rời kênh.
- Không ghi âm, lưu giọng nói hoặc tự chuyển thành văn bản.

Xử lý quyền micro bị từ chối, không có thiết bị, mất thiết bị và kết nối lại. Voice lỗi không được làm hỏng game.

Thiết kế sức chứa voice cho tối đa 100 người của một phòng, chia theo các bàn 6 người. Ghi rõ chi phí, hạn mức dịch vụ và yêu cầu hạ tầng; không mặc định gói miễn phí đáp ứng được.

## 12. Nhạc nền và âm thanh quán

Nhạc không lời nhẹ, guitar hoặc hòa tấu mang màu sắc hoài niệm Việt Nam, phù hợp trò chuyện.

- Chỉ dùng nhạc tự sáng tác hoặc có quyền sử dụng rõ ràng.
- Không tự lấy bài hát thương mại.
- Nếu chưa có tài sản âm thanh phù hợp, cung cấp chỗ tích hợp và hướng dẫn thay tệp; ghi rõ phần còn thiếu.
- Có tiếng quạt, côn trùng, xe xa, bát đũa và không khí quán ở mức nhỏ.
- Các hiệu ứng trong thế giới có khoảng cách nghe hợp lý.

Điều khiển riêng cho:
- Voice.
- Nhạc nền.
- Hiệu ứng và môi trường.

Nhạc chỉ bắt đầu sau thao tác của người chơi. Lưu tùy chọn trên thiết bị. Khi có người nói, giảm nhạc nhẹ rồi khôi phục từ từ. Hiệu ứng “Dô!” không lấn át lời nói.

Nhạc phát riêng trên từng thiết bị, chưa cần đồng bộ bài và thời điểm phát giữa người chơi.

## 13. Donate ủng hộ quán

Thêm nút **“Ủng hộ quán”** có biểu tượng trái tim, không che phần chơi.

Bảng donate hiển thị:
- **Ngân hàng: Vietcombank.**
- **Số tài khoản: 1035433028.**
- Nút “Sao chép số tài khoản”.
- Mã VietQR đúng ngân hàng và số tài khoản.
- Không cố định số tiền.
- Nội dung chuyển khoản gợi ý: **UNG HO QUAN NHAU**.
- Chỉ hiển thị tên chủ tài khoản sau khi tôi cung cấp, không tự điền.
- Lời nhắn: “Cảm ơn bạn đã mời quán một ly! Khoản ủng hộ giúp duy trì máy chủ và phát triển game.”

Kiểm tra dữ liệu QR trước khi bàn giao. Nếu ảnh QR không tải được, vẫn hiển thị số tài khoản và chức năng sao chép.

Donate tự nguyện, không bắt buộc để chơi và không tạo lợi thế. Không tự báo đã nhận tiền, không bịa người donate hoặc số tiền.

Bản đầu không tích hợp đối soát ngân hàng. Ghi rõ game không tự xác nhận chuyển khoản.

Bảng có nút đóng, hỗ trợ bàn phím, quản lý focus và hiển thị tốt trên điện thoại.

## 14. Giao diện

Toàn bộ bằng tiếng Việt:
- Góc trên trái: tên quán, mã phòng, số người /100 và mời bạn.
- Góc trên phải: âm thanh, cài đặt, ủng hộ, rời quán.
- Góc dưới: chat và thanh hành động.
- Khi ngồi, hiển thị số bàn, số người /6 và điều khiển voice.
- Có danh sách thành viên bàn để nhận biết và tắt tiếng.
- Các bảng thu gọn được, không phủ kín thế giới 3D.
- Nút đủ lớn trên điện thoại, chữ tương phản tốt.
- Có trạng thái focus, loading, disabled, error và empty.
- Có màn hình tải, thông báo WebGL không hỗ trợ và cách thử lại khi tải lỗi.
- Có tùy chọn giảm chuyển động và chất lượng đồ họa.

## 15. Kiến trúc đề xuất

Ưu tiên:
- TypeScript.
- React và React Three Fiber/Three.js.
- Node.js với Socket.IO hoặc Colyseus cho multiplayer.
- LiveKit cho voice SFU.
- Kiểu dữ liệu và định nghĩa sự kiện dùng chung khi phù hợp.

Chọn một giải pháp multiplayer chính, không lắp nhiều framework làm cùng việc. Có thể thay công nghệ nếu phù hợp hơn, giải thích ngắn lợi ích và chi phí.

Tách rõ:
- Hiển thị 3D và điều khiển.
- Giao diện.
- Logic phòng và bàn.
- Giao thức đồng bộ.
- Cấp quyền voice.
- Cấu hình triển khai.

Một tiến trình có thể sở hữu nhiều phòng nếu đo tải cho phép. Mỗi phòng phải có một nơi sở hữu trạng thái rõ ràng. Khi chạy nhiều tiến trình, cần định tuyến người chơi về đúng tiến trình sở hữu phòng; không giả định thêm Redis adapter là tự giải quyết đồng bộ trạng thái.

Nếu bản đầu chỉ triển khai một tiến trình và lưu phòng trong bộ nhớ:
- Ghi rõ phòng mất khi khởi động lại.
- Chưa tuyên bố hỗ trợ mở rộng ngang hoặc khôi phục phòng.
- Chỉ đưa thêm cơ sở dữ liệu/Redis khi có nhu cầu cụ thể.

## 16. Bảo mật và bất biến

Máy chủ kiểm tra:
- Tối đa 100 người mỗi phòng.
- Tối đa 6 người mỗi bàn.
- Một người một ghế, một ghế một người.
- Một lượt mini game mỗi bàn.
- Khoảng cách tương tác.
- Quyền gọi món, điều khiển mini game và quản lý phòng.
- Quyền vào voice theo trạng thái ghế.
- Độ dài, kiểu và tần suất dữ liệu gửi lên.

Có chống spam, giới hạn tạo phòng và cơ chế dọn phòng trống, phiên hết hạn.

Không dùng localStorage làm dữ liệu multiplayer. Chỉ lưu tùy chọn và thông tin nối lại phiên cần thiết; không đưa bí mật phiên vào link mời hoặc log.

Không nhúng bí mật vào frontend. Có tệp môi trường mẫu, kiểm tra origin, hướng dẫn HTTPS/WSS và cấu hình máy chủ.

## 17. Hiệu năng cho quán đông người

- Tái sử dụng mô hình, vật liệu, texture và dùng instancing khi phù hợp.
- Có LOD hoặc giảm độ chi tiết nhân vật ở xa.
- Giảm cập nhật hoạt ảnh với nhân vật xa.
- Frustum culling, giới hạn bóng đổ và ánh sáng động.
- Không tạo nguồn sáng hoặc hiệu ứng tốn kém riêng cho mọi nhân vật.
- Giới hạn số món và hiệu ứng đồng thời.
- Mức thấp cho điện thoại: giảm độ phân giải, bóng, hiệu ứng và chi tiết.
- Dọn tài nguyên khi rời phòng.
- Theo dõi FPS, bộ nhớ, lưu lượng mạng và độ trễ máy chủ trong quá trình kiểm tra.

Mục tiêu là 100 người cùng phòng, nhưng chỉ xác nhận mức tải đã kiểm chứng. Nếu chưa đạt, báo nút thắt và giới hạn hiện tại.

## 18. Thứ tự triển khai

Trước khi viết mã, trình bày ngắn:
1. Luồng chơi.
2. Kiến trúc và trách nhiệm máy chủ.
3. Cách tổ chức 100 người, 17 bàn và voice theo bàn.
4. Cấu trúc thư mục.
5. Những dịch vụ, tài sản hoặc chi phí cần thiết.

Sau đó triển khai:
1. Quán 3D, nhân vật, camera và va chạm.
2. Multiplayer: hai người vào phòng, thấy nhau di chuyển.
3. Ghế và bàn do máy chủ quản lý.
4. Chat, gọi món, cụng ly.
5. Mini game.
6. Voice 6 người mỗi bàn.
7. Nhạc, âm thanh và donate.
8. Interest management, tối ưu và kiểm tra tải 100 người.

Không trì hoãn xử lý kiến trúc tải đến cuối: chuẩn bị mô hình đồng bộ phù hợp từ đầu, rồi đo và tối ưu sau khi vòng chơi hoàn chỉnh.

## 19. Kiểm tra

**Chức năng với nhiều phiên thật:**
- Tạo phòng, tìm phòng và vào bằng link/mã.
- Di chuyển, ngồi, đứng và đồng bộ.
- Hai người tranh cùng ghế.
- Bàn đủ 6 người.
- Chat quán và chat bàn đúng phạm vi.
- Gọi món, cụng ly và mini game.
- Chủ phòng hoặc điều phối bàn rời giữa lượt.
- Mất mạng, nối lại và hết thời gian giữ chỗ.
- Đổi bàn không còn nghe/nói ở bàn cũ.
- Voice với 6 người trên các thiết bị và mạng khác nhau.
- Nhạc giảm khi có lời nói.
- Điều khiển cảm ứng và donate.

**Tải và giới hạn:**
- Tạo tải 100 phiên có di chuyển và tương tác, không chỉ mở socket.
- Phiên thứ 101 bị từ chối khi phòng đã đủ.
- Thử nhiều yêu cầu vào phòng và chiếm ghế đồng thời.
- Đo CPU, bộ nhớ, băng thông, độ trễ và lỗi.
- Kiểm tra tải SFU riêng, phân biệt người kết nối, người nhận âm thanh và người đang phát.
- Dùng công cụ kiểm tra tải phù hợp, không bắt một máy dựng 100 cảnh 3D.
- Bot dùng cho kiểm tra phải được phân biệt với người chơi thật.
- Báo rõ đâu là kiểm tra mô phỏng, đâu là thử nghiệm với người và thiết bị thật.

## 20. Bàn giao

Cung cấp:
- Toàn bộ mã nguồn.
- Hướng dẫn chạy frontend, backend và voice.
- Tệp môi trường mẫu không chứa bí mật.
- Hướng dẫn triển khai, cấu hình HTTPS/WSS và kết nối SFU/TURN.
- Danh sách mô hình, texture, âm thanh cùng giấy phép.
- Kết quả kiểm tra chức năng và tải.
- Chi phí dự kiến theo giả định rõ ràng, đặc biệt cho máy chủ và voice.
- Các giới hạn, phần dùng tài sản thay thế và tính năng chưa kiểm chứng.

Nếu môi trường không cho chạy dịch vụ hoặc kiểm tra đủ tải, vẫn hoàn thiện mã và hướng dẫn, đồng thời nói rõ giới hạn. Không gọi bản demo giả hoặc kiểm tra chưa đủ là hệ thống đã phục vụ được 100 người.
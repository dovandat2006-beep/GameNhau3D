# Tài sản và giấy phép

- **Mô hình quán, nhà, mái bạt, bàn ghế, quầy, cây, xe đạp, quạt, đồ ăn, nhân vật**: hình học Three.js nguyên thủy tự tạo trong `client/scene.tsx`. Không tải mô hình/texture từ website tham khảo. Bản cập nhật dùng texture chụp thật Poly Haven CC0 độc lập, liệt kê bên dưới. Nhãn đồ uống hư cấu/không nhãn thương mại. Không có ảnh tham khảo đính kèm ngoài văn bản.
- **Bảng hiệu và biển bàn**: CanvasTexture từ chữ, tạo trên thiết bị; font hệ thống Georgia cho texture. UI dùng Be Vietnam Pro và Lora qua Google Fonts (SIL Open Font License, xem repository chính thức của Google Fonts). Nếu cần offline/CSP chặt, tải và tự host các font cùng file OFL; hiện UI có fallback khi font mạng không đến.
- **Nhạc**: một giai điệu ngũ cung 32 nốt do mã trong `client/audio.ts` tạo, dao động triangle/sine mô phỏng tiếng dây gảy. Không phải bản thu guitar hay bài thương mại, không có sample ngoài. Nhạc bắt đầu sau thao tác và phát riêng từng máy.
- **Sfx**: tiếng chạm ly, quạt/không khí phố, côn trùng, xe xa và bát đũa là tổng hợp Web Audio; mang tính gợi không khí, chưa phải foley thu âm thực tế. Dô suy hao theo khoảng cách, chỉ cùng bàn; nhạc duck khi SFU báo người nói.
- **Icon**: lucide-react, ISC. React MIT; Three.js MIT; Socket.IO MIT; LiveKit client/server SDK Apache-2.0; QRCode MIT. Chi tiết giấy phép xem từng package trong node_modules và lockfile.
- **VietQR**: tự tạo EMVCo TLV NAPAS credit transfer: BIN Vietcombank 970436, tài khoản 1035433028, VND 704, không có số tiền/tên chủ tài khoản, nội dung UNG HO QUAN NHAU. CRC16 và các trường có test. Không gọi API ngân hàng và chưa thử lệnh chuyển tiền thật.

Muốn thay nhạc bằng bản thu: chỉ dùng bản gốc hoặc có license cho phân phối game; thay bộ tạo nốt bằng AudioBufferSourceNode nối vào `musicGain`, giữ user gesture và gain ducking. Đặt tệp tại public/audio, ghi tên tác giả/license/nguồn vào tệp này. Không lấy bài thương mại. Mã nguồn dự án có trong workspace; không tự áp đặt giấy phép phát hành cho tài sản của chủ dự án.

## PBR texture update — 03/11/2026
12 local 1K JPEGs in `public/textures/`, about 5.7 MiB total. For each surface: diffuse (sRGB), OpenGL normal and roughness (linear). Full original URLs are recorded in `public/textures/manifest.json`.

| Local surface | Poly Haven asset | License |
|---|---|---|
| concrete | https://polyhaven.com/a/concrete_floor_worn_001 | CC0-1.0 |
| plaster | https://polyhaven.com/a/yellow_plaster | CC0-1.0 |
| asphalt | https://polyhaven.com/a/asphalt_02 | CC0-1.0 |
| metal | https://polyhaven.com/a/corrugated_iron_02 | CC0-1.0 |

License reference: https://polyhaven.com/license. Local files are redistributed unmodified. `python3 scripts/fetch-textures.py` reproduces the download through the official API. No reference-site assets were copied. Characters and joint motion are original code in `client/avatar.ts` and `client/avatars.tsx`; no downloaded actor, rig, motion capture or external animation license is involved. The mug is actual 3D geometry following the hand during cheers, not a UI icon or image.

## Stage / social update
Stage, ramp, speakers, fixtures and virtual intoxication markers are original Three.js geometry. The electronic stage loop (kick, bass, hi-hat and synth motif) and clap effect are generated in `client/audio.ts`, with no commercial recording or external sample. Dance choreography and facial gestures are original joint calculations. Existing Poly Haven surface licenses are unchanged. No new model, music service or royalty payment is required for these additions.

## Venue and parked motorcycles
`client/venue.tsx` contains original procedural meshes for the entrance/reception, WC fixtures and six parked motorcycles. Sport and step-through silhouettes are inspired by Xì-po/Dream; no brand logos, copied models or vehicle textures are used. Hiphop, Krump and Running Man poses are original code in `client/avatar.ts`, with no external motion-capture clips.

Crawling and smoking are original procedural poses. Cigarette/ember and three small smoke meshes are unbranded generated geometry; no external tobacco assets or recordings are used.

Eight male/female character presets, six facial proportions, additional hair/brow meshes, running poses and receptionist Hạnh are original procedural geometry/code. NPC replies are original scripted Vietnamese text; no outside AI, character model, branded outfit or voice asset is used.

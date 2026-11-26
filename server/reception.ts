import {MENU,type Player,type TableState} from '../shared/world';
import {drunkLevel} from '../shared/social';
/** Scripted NPC replies only; nothing is posted to player chat or sent to an external service. */
export function receptionReply(text:string,p:Player,tables:TableState[]){
 const q=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
 if(/wc|ve sinh|toilet/.test(q))return 'WC ở góc cuối sân bên trái, có biển chỉ dẫn. Bạn đi theo lối ngoài các bàn nhé.';
 if(/ban trong|ban nao|cho ngoi|con cho|con ban|bao nhieu|tim ban/.test(q)){
  const free=tables.filter(t=>t.seats.some(s=>!s)),seats=tables.reduce((n,t)=>n+t.seats.filter(s=>!s).length,0);
  return free.length?`Hiện còn ${seats} ghế ở ${free.length} bàn. Bàn ${free.slice(0,4).map(t=>t.id).join(', ')} còn chỗ. Mở Tìm bàn, đi tới ghế và nhấn E nhé; mình chưa giữ ghế cho bạn.`:'Hiện các ghế đã có người. Bạn có thể trò chuyện ngoài sân và chờ một chút nhé.';
 }
 if(/san khau|nhay|hiphop/.test(q))return 'Sân khấu ở cuối sân, phía sau tất cả các bàn. Hai bên có dốc lên. Cất cốc rồi mở Nhảy để chọn điệu hoặc rủ bạn so tài.';
 if(/mon|menu|an gi|bia|tra da|nuoc/.test(q))return `Quán có ${MENU.map(m=>m.name.toLowerCase()).join(', ')}. Ngồi vào bàn rồi mở Gọi món nhé. Món và đồ uống đều là vật phẩm ảo.`;
 if(/say|non|tinh/.test(q))return `Bạn đang ở mức say ${drunkLevel(p.intoxication)}/10. Không uống thêm sẽ hồi một cấp mỗi 60 giây. Từ cấp 5 có cử chỉ Nôn; cấp 10 chỉ bò, vẫn có thể ngồi nghỉ.`;
 if(/nhan vat|tao hinh|chieu cao|can nang/.test(q))return 'Mở Nhân vật để chọn mẫu nam/nữ, khuôn mặt, màu áo và chỉnh chiều cao 1–2 m, cân nặng 40–150 kg. Bấm Lưu tạo hình để mọi người cùng thấy.';
 if(/chay|di chuyen|cach choi|dieu khien/.test(q))return 'WASD hoặc joystick để đi; giữ Shift hoặc bật nút Chạy để chạy 2,5. Khi say chạy sẽ loạng choạng mạnh hơn. Kéo cảnh để xoay camera, E để ngồi/đứng.';
 if(/ten gi|la ai|ban ten/.test(q))return 'Mình là Hạnh, lễ tân NPC của quán. Mình trả lời theo kịch bản về bàn, món, sân khấu và cách chơi.';
 if(/cam on/.test(q))return 'Không có gì, chúc bạn có buổi gặp bạn bè vui ở Đầu Hẻm!';
 if(/chao|hello|hi\b/.test(q))return `Chào ${p.name}! Mình là Hạnh, lễ tân NPC. Bạn muốn tìm bàn, xem món hay hỏi đường tới sân khấu?`;
 return 'Mình có thể giúp về bàn trống, món ăn, WC, sân khấu, tạo hình và cách chơi. Bạn muốn hỏi mục nào?';
}

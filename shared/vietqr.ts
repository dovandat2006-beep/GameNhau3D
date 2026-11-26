// EMVCo Merchant Presented QR / VietQR NAPAS credit transfer. No fixed amount.
function tlv(id:string,value:string){return id+String(new TextEncoder().encode(value).length).padStart(2,'0')+value;}
export function crc16(s:string){let crc=0xffff;for(const b of new TextEncoder().encode(s)){crc^=b<<8;for(let i=0;i<8;i++)crc=crc&0x8000?(crc<<1)^0x1021:crc<<1;crc&=0xffff;}return crc.toString(16).toUpperCase().padStart(4,'0');}
export function vietQR(){
 const bank=tlv('00','970436')+tlv('01','1035433028');
 const merchant=tlv('00','A000000727')+tlv('01',bank)+tlv('02','QRIBFTTA');
 const body=tlv('00','01')+tlv('01','11')+tlv('38',merchant)+tlv('53','704')+tlv('58','VN')+tlv('62',tlv('08','UNG HO QUAN NHAU'))+'6304';
 return body+crc16(body);
}

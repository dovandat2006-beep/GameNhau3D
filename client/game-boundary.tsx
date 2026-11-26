import {Component,type ReactNode} from 'react';
/** Keep a recoverable screen visible if a UI render/effect fails. Preferences stay untouched. */
export class GameBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main className="webgl-error" role="alert"><h2>Giao diện vừa gặp lỗi</h2><p>Tải lại game để kết nối lại quán. Tạo hình đã lưu trên máy vẫn được giữ.</p><button onClick={()=>location.reload()}>Tải lại game</button></main>:this.props.children;}
}

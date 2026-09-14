import { useState, useEffect, useRef } from 'react';
import { IABUG_SENHA } from '../api';

interface IabugPasswordModalProps { isOpen: boolean; onCancel: () => void; onSuccess: () => void; }

export function IabugPasswordModal({ isOpen, onCancel, onSuccess }: IabugPasswordModalProps) {
  const [senha, setSenha] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (isOpen) { setSenha(''); setErro(''); setTimeout(() => inputRef.current && inputRef.current.focus(), 80); } }, [isOpen]);

  function confirmar() {
    if (senha === IABUG_SENHA) { onSuccess(); }
    else { setErro('Senha incorreta.'); setSenha(''); }
  }

  return (
    <div className={`modal-overlay ${isOpen ? 'is-active' : ''}`}>
      <div className="modal-box">
        <h3>&#9888; Acesso Restrito</h3>
        <p>Digite a senha para acessar o setor de teste.</p>
        <input ref={inputRef} type="password" maxLength={20} placeholder="• • • • • • • •" autoComplete="off"
          value={senha} onChange={e => setSenha(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmar(); }} />
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-accent" onClick={confirmar}>Entrar</button>
        </div>
        <div className="modal-err">{erro}</div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PREFERIDAS = ['natural', 'google português do brasil', 'google portugues do brasil', 'francisca', 'antonio', 'antônio', 'luciana', 'thalita', 'maria'];

export const VELOCIDADES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function suportaVoz() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Monta a fila de leitura. Cada item: { texto, id } em que id é o id do elemento
 * do DOM a destacar (ou null).
 */
export function montarFila(post) {
  const fila = [];
  fila.push({ texto: post.titulo, id: 'artigo-titulo' });
  if (post.subtitulo) fila.push({ texto: post.subtitulo, id: 'artigo-subtitulo' });
  if (post.pontosChave?.length) {
    fila.push({ texto: 'Pontos-chave.', id: 'artigo-pontos' });
    post.pontosChave.forEach((p, i) => fila.push({ texto: p, id: `ponto-${i}` }));
  }
  (post.secoes || []).forEach((secao, si) => {
    if (secao.titulo) fila.push({ texto: secao.titulo, id: `secao-${si}-titulo` });
    (secao.paragrafos || []).forEach((p, pi) => fila.push({ texto: p, id: `par-${si}-${pi}` }));
  });
  if (post.porQueImporta) {
    fila.push({ texto: 'Por que importa.', id: 'artigo-importa' });
    fila.push({ texto: post.porQueImporta, id: 'artigo-importa-texto' });
  }
  const nomes = [...new Set((post.fontes || []).map((f) => f.nome).filter(Boolean))];
  if (nomes.length) fila.push({ texto: `Fontes: ${nomes.join(', ')}.`, id: 'artigo-fontes' });
  return fila.filter((item) => item.texto && item.texto.trim());
}

function pontuar(voz) {
  const nome = voz.name.toLowerCase();
  let pontos = 0;
  if (PREFERIDAS.some((p) => nome.includes(p))) pontos += 10;
  if (nome.includes('natural')) pontos += 5;
  if (voz.lang?.toLowerCase() === 'pt-br') pontos += 3;
  if (!voz.localService) pontos += 1;
  return pontos;
}

export function useLeitorVoz(post) {
  const suportado = suportaVoz();
  const fila = useMemo(() => (post ? montarFila(post) : []), [post]);

  const [estado, setEstado] = useState('parado'); // parado | falando | pausado
  const [indice, setIndice] = useState(0);
  const [velocidade, setVelocidade] = useState(1);
  const [vozes, setVozes] = useState([]);
  const [vozUri, setVozUri] = useState('');

  const idRef = useRef(0); // invalida callbacks de falas antigas
  const filaRef = useRef(fila);
  const velRef = useRef(velocidade);
  const vozRef = useRef(null);
  const indiceRef = useRef(0);

  useEffect(() => { filaRef.current = fila; }, [fila]);
  useEffect(() => { velRef.current = velocidade; }, [velocidade]);

  // carrega vozes pt-BR (podem chegar depois, via voiceschanged)
  useEffect(() => {
    if (!suportado) return undefined;
    const synth = window.speechSynthesis;
    const carregar = () => {
      const todas = synth.getVoices();
      const pt = todas.filter((v) => v.lang?.toLowerCase().startsWith('pt'));
      pt.sort((a, b) => pontuar(b) - pontuar(a));
      setVozes(pt);
      setVozUri((atual) => (atual && pt.some((v) => v.voiceURI === atual) ? atual : pt[0]?.voiceURI || ''));
    };
    carregar();
    synth.addEventListener('voiceschanged', carregar);
    return () => synth.removeEventListener('voiceschanged', carregar);
  }, [suportado]);

  useEffect(() => {
    vozRef.current = vozes.find((v) => v.voiceURI === vozUri) || null;
  }, [vozes, vozUri]);

  const falar = useCallback((i) => {
    if (!suportado) return;
    const synth = window.speechSynthesis;
    const itens = filaRef.current;
    idRef.current += 1;
    const meuId = idRef.current;
    synth.cancel();

    if (i >= itens.length) {
      setEstado('parado');
      setIndice(0);
      indiceRef.current = 0;
      return;
    }

    indiceRef.current = i;
    setIndice(i);
    setEstado('falando');

    const u = new SpeechSynthesisUtterance(itens[i].texto);
    u.lang = vozRef.current?.lang || 'pt-BR';
    if (vozRef.current) u.voice = vozRef.current;
    u.rate = velRef.current;
    u.onend = () => {
      if (idRef.current !== meuId) return;
      falar(i + 1);
    };
    u.onerror = (e) => {
      if (idRef.current !== meuId) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      setEstado('parado');
    };
    // pequeno atraso: evita bug do Chrome em cancel() seguido de speak()
    setTimeout(() => {
      if (idRef.current === meuId) synth.speak(u);
    }, 30);
  }, [suportado]);

  const tocar = useCallback(() => {
    if (!suportado) return;
    const synth = window.speechSynthesis;
    if (estado === 'pausado') {
      synth.resume();
      setEstado('falando');
      return;
    }
    falar(estado === 'parado' ? 0 : indiceRef.current);
  }, [suportado, estado, falar]);

  const pausar = useCallback(() => {
    if (!suportado) return;
    window.speechSynthesis.pause();
    setEstado('pausado');
  }, [suportado]);

  const parar = useCallback(() => {
    if (!suportado) return;
    idRef.current += 1;
    window.speechSynthesis.cancel();
    setEstado('parado');
    setIndice(0);
    indiceRef.current = 0;
  }, [suportado]);

  const ir = useCallback((i) => {
    const alvo = Math.max(0, Math.min(filaRef.current.length - 1, i));
    falar(alvo);
  }, [falar]);

  const alterarVelocidade = useCallback((v) => {
    setVelocidade(v);
    velRef.current = v;
    if (estado === 'falando') falar(indiceRef.current);
  }, [estado, falar]);

  const alterarVoz = useCallback((uri) => {
    setVozUri(uri);
    vozRef.current = vozes.find((v) => v.voiceURI === uri) || null;
    if (estado === 'falando') falar(indiceRef.current);
  }, [estado, vozes, falar]);

  // cancela ao desmontar / sair da página
  useEffect(() => {
    if (!suportado) return undefined;
    const sair = () => window.speechSynthesis.cancel();
    window.addEventListener('pagehide', sair);
    window.addEventListener('beforeunload', sair);
    return () => {
      window.removeEventListener('pagehide', sair);
      window.removeEventListener('beforeunload', sair);
      idRef.current += 1;
      window.speechSynthesis.cancel();
    };
  }, [suportado]);

  const itemAtual = estado === 'parado' ? null : fila[indice] || null;

  return {
    suportado,
    estado,
    indice,
    total: fila.length,
    itemAtual,
    velocidade,
    vozes,
    vozUri,
    tocar,
    pausar,
    parar,
    anterior: () => ir(indiceRef.current - 1),
    proximo: () => ir(indiceRef.current + 1),
    alterarVelocidade,
    alterarVoz,
  };
}

import React from 'react';
import { motion } from 'framer-motion';
import './Rodape.css';

const Rodape = () => {
  const linksUteis = [
    { nome: 'Início', href: '#inicio' },
    { nome: 'Sobre', href: '#sobre' },
    { nome: 'Serviços', href: '#servicos' },
    { nome: 'Equipe', href: '#equipe' },
    { nome: 'Contato', href: '#contato' }
  ];

  const servicos = [
    { nome: 'Criação de Sites', href: '#servicos' },
    { nome: 'Landing Pages', href: '#servicos' },
    { nome: 'Sistemas Web', href: '#servicos' },
    { nome: 'Consultoria', href: '#contato' }
  ];

  const redesSociais = [
    { nome: 'LinkedIn', icone: '💼', link: '#' },
    { nome: 'Instagram', icone: '📸', link: '#' },
    { nome: 'Twitter', icone: '🐦', link: '#' },
    { nome: 'Facebook', icone: '📘', link: '#' }
  ];

  return (
    <footer className="rodape">
      <div className="container">
        <div className="rodape-conteudo">
          <motion.div 
            className="rodape-secao empresa-info"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="logo-rodape">HDL Soluções</h3>
            <p className="descricao-empresa">
              Transformamos suas ideias em realidade digital. 
              Especialistas em desenvolvimento web com soluções 
              personalizadas para impulsionar seu negócio.
            </p>
            
            <div className="contato-rapido">
              <div className="contato-item">
                <span className="icone">📧</span>
                <a href="mailto:contato@hdlsolucoes.com">contato@hdlsolucoes.com</a>
              </div>
              <div className="contato-item">
                <span className="icone">📱</span>
                <a href="https://wa.me/5511999999999">(11) 99999-9999</a>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="rodape-secao"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4>Links Úteis</h4>
            <ul className="lista-links">
              {linksUteis.map((link, index) => (
                <li key={index}>
                  <a href={link.href} className="link-rodape">
                    {link.nome}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            className="rodape-secao"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4>Nossos Serviços</h4>
            <ul className="lista-links">
              {servicos.map((servico, index) => (
                <li key={index}>
                  <a href={servico.href} className="link-rodape">
                    {servico.nome}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            className="rodape-secao redes-secao"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h4>Nos Siga</h4>
            <div className="redes-sociais-rodape">
              {redesSociais.map((rede, index) => (
                <motion.a
                  key={index}
                  href={rede.link}
                  className="rede-social-link"
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  title={rede.nome}
                >
                  <span className="rede-icone">{rede.icone}</span>
                </motion.a>
              ))}
            </div>
            
            <div className="newsletter">
              <h5>Newsletter</h5>
              <p>Receba nossas novidades e dicas</p>
              <div className="newsletter-form">
                <input 
                  type="email" 
                  placeholder="Seu email" 
                  className="input-newsletter"
                />
                <button className="botao-newsletter">
                  ✉️
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="rodape-linha"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        ></motion.div>

        <div className="rodape-bottom">
          <div className="copyright">
            <p>&copy; 2024 HDL Soluções. Todos os direitos reservados.</p>
          </div>
          
          <div className="links-legais">
            <a href="#" className="link-legal">Política de Privacidade</a>
            <a href="#" className="link-legal">Termos de Uso</a>
            <a href="#" className="link-legal">Cookies</a>
          </div>
        </div>

        <motion.div 
          className="botao-voltar-topo"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ⬆️
        </motion.div>
      </div>
    </footer>
  );
};

export default Rodape;
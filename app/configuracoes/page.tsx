
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from '../../lib/supabase';

type Theme = 'light' | 'dark' | 'system';
type ButtonStyle = 'rounded' | 'square' | 'pill';

const defaults = {
  primary_color: '#172033',
  accent_color: '#E8B85B',
  font_family: 'Arial',
  theme: 'dark' as Theme,
  button_style: 'rounded' as ButtonStyle,
};

export default function Configuracoes() {
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState(defaults.primary_color);
  const [accentColor, setAccentColor] = useState(defaults.accent_color);
  const [fontFamily, setFontFamily] = useState(defaults.font_family);
  const [theme, setTheme] = useState<Theme>(defaults.theme);
  const [buttonStyle, setButtonStyle] =
    useState<ButtonStyle>(defaults.button_style);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function carregarConfiguracoes() {
      try {
        const supabase = getSupabase() as any;

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error('Entre na sua conta para acessar as configurações.');
        }

        const { data: membership, error: membershipError } =
          await supabase
            .from('company_members')
            .select('company_id')
            .eq('user_id', authData.user.id)
            .limit(1)
            .maybeSingle();

        if (membershipError) throw membershipError;

        if (!membership?.company_id) {
          throw new Error('Sua conta não está vinculada a uma empresa.');
        }

        const { data: company, error: companyError } =
          await supabase
            .from('companies')
            .select('id, name')
            .eq('id', membership.company_id)
            .maybeSingle();

        if (companyError) throw companyError;
        if (!company) throw new Error('Empresa não encontrada.');

        const { data: settings, error: settingsError } =
          await supabase
            .from('company_settings')
            .select(
              'primary_color, accent_color, font_family, theme, button_style'
            )
            .eq('company_id', company.id)
            .maybeSingle();

        if (settingsError) throw settingsError;

        if (!active) return;

        setCompanyId(company.id);
        setCompanyName(company.name);

        if (settings) {
          setPrimaryColor(settings.primary_color);
          setAccentColor(settings.accent_color);
          setFontFamily(settings.font_family);
          setTheme(settings.theme);
          setButtonStyle(settings.button_style);
        }
      } catch (err) {
        console.error(err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar as configurações.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    carregarConfiguracoes();

    return () => {
      active = false;
    };
  }, []);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!companyId || saving) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const supabase = getSupabase() as any;

      const { error: saveError } = await supabase
        .from('company_settings')
        .upsert(
          {
            company_id: companyId,
            primary_color: primaryColor,
            accent_color: accentColor,
            font_family: fontFamily,
            theme,
            button_style: buttonStyle,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id' }
        );

      if (saveError) throw saveError;

      setMessage('Preferências salvas com sucesso!');
    } catch (err) {
      console.error(err);
      setError(
        'Não foi possível salvar. Verifique se sua conta tem o papel owner.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Carregando configurações...</main>;
  }

  const dark = theme === 'dark';
  const background = dark ? '#172033' : '#FFFFFF';
  const textColor = dark ? '#FFFFFF' : '#172033';
  const mutedColor = dark ? '#CBD5E1' : '#64748B';

  const cardStyle = {
    background: dark ? '#263349' : '#F8FAFC',
    border: `1px solid ${dark ? '#384459' : '#E2E8F0'}`,
    borderRadius: 12,
    padding: 18,
  };

  const fieldStyle = {
    display: 'block',
    width: '100%',
    padding: 10,
    marginTop: 6,
    marginBottom: 16,
    boxSizing: 'border-box' as const,
    border: '1px solid #CBD5E1',
    borderRadius: 6,
    background: '#FFFFFF',
    color: '#172033',
  };

  const buttonRadius =
    buttonStyle === 'pill' ? 999 :
    buttonStyle === 'square' ? 3 : 10;

  return (
    <main
      style={{
        maxWidth: 1050,
        margin: '30px auto',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
        color: '#172033',
      }}
    >
      <a href="/" style={{ color: '#2563EB' }}>
        ← Voltar ao painel financeiro
      </a>

      <h1 style={{ marginBottom: 6 }}>Configurações</h1>
      <p style={{ color: '#64748B', marginTop: 0 }}>
        Personalize a aparência da empresa: {companyName}
      </p>

      {error && (
        <p
          role="alert"
          style={{
            padding: 12,
            borderRadius: 8,
            background: '#FEF2F2',
            color: '#B91C1C',
          }}
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          style={{
            padding: 12,
            borderRadius: 8,
            background: '#F0FDF4',
            color: '#166534',
          }}
        >
          {message}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <form
          onSubmit={salvar}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: 22,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Personalização</h2>

          <label htmlFor="primaryColor">Cor principal</label>
          <input
            id="primaryColor"
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            style={fieldStyle}
          />

          <label htmlFor="accentColor">Cor de destaque</label>
          <input
            id="accentColor"
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            style={fieldStyle}
          />

          <label htmlFor="fontFamily">Fonte</label>
          <select
            id="fontFamily"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            style={fieldStyle}
          >
            <option value="Arial">Arial</option>
            <option value="Verdana">Verdana</option>
            <option value="Georgia">Georgia</option>
            <option value="Trebuchet MS">Trebuchet MS</option>
          </select>

          <label htmlFor="theme">Modo de visualização</label>
          <select
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
            style={fieldStyle}
          >
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
            <option value="system">Padrão do sistema</option>
          </select>

          <label htmlFor="buttonStyle">Estilo dos botões</label>
          <select
            id="buttonStyle"
            value={buttonStyle}
            onChange={(e) =>
              setButtonStyle(e.target.value as ButtonStyle)
            }
            style={fieldStyle}
          >
            <option value="rounded">Arredondado</option>
            <option value="square">Quadrado</option>
            <option value="pill">Formato cápsula</option>
          </select>

          <button
            type="submit"
            disabled={saving || !companyId}
            style={{
              width: '100%',
              padding: 12,
              border: 0,
              borderRadius: buttonRadius,
              background: primaryColor,
              color: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar personalização'}
          </button>
        </form>

        <section
          style={{
            background,
            color: textColor,
            border: `1px solid ${dark ? '#384459' : '#E2E8F0'}`,
            borderRadius: 12,
            padding: 22,
            fontFamily,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Pré-visualização</h2>
          <p style={{ color: mutedColor }}>
            Veja como as escolhas aparecem nesta amostra.
          </p>

          <div style={cardStyle}>
            <p style={{ color: mutedColor, marginTop: 0 }}>
              Saldo disponível
            </p>
            <h2 style={{ margin: 0 }}>R$ 12.450,00</h2>
          </div>

          <button
            type="button"
            style={{
              marginTop: 16,
              width: '100%',
              padding: 12,
              border: 0,
              borderRadius: buttonRadius,
              background: accentColor,
              color: '#172033',
              fontFamily,
              fontWeight: 600,
            }}
          >
            Exemplo de botão
          </button>

          <p style={{ color: mutedColor, fontSize: 13 }}>
            As mudanças aparecem nesta prévia. Na próxima etapa,
            vamos conectar essas preferências ao painel financeiro inteiro.
          </p>
        </section>
      </div>
    </main>
  );
}


'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getSupabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type Company = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  company_id: string;
  name: string;
  kind: string;
  active: boolean;
};

type Transaction = {
  id: string;
  company_id: string;
  kind: string;
  description: string;
  category_id: string | null;
  amount: number | string;
  occurred_on: string;
  payment_method: string | null;
  account_name: string | null;
  responsible_user_id: string;
  notes: string | null;
  created_at: string;
};

type TransactionKind =
  | 'entrada'
  | 'saida'
  | 'transferencia'
  | 'aporte'
  | 'retirada';

type CategoryKind = 'entrada' | 'saida' | 'ambos';

function hojeLocal() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

async function buscarDadosEmpresa(companyId: string) {
  const supabase = getSupabase();

  const [categoriasResult, lancamentosResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, company_id, name, kind, active')
      .eq('company_id', companyId)
      .order('name'),

    supabase
      .from('transactions')
      .select(
        'id, company_id, kind, description, category_id, amount, occurred_on, payment_method, account_name, responsible_user_id, notes, created_at'
      )
      .eq('company_id', companyId)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (categoriasResult.error) throw categoriasResult.error;
  if (lancamentosResult.error) throw lancamentosResult.error;

  return {
    categories: (categoriasResult.data ?? []) as Category[],
    transactions: (lancamentosResult.data ?? []) as Transaction[],
  };
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [company, setCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState('STORE FINCH');

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [companyCheckFailed, setCompanyCheckFailed] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [sending, setSending] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [kind, setKind] = useState<TransactionKind>('entrada');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(hojeLocal());
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountName, setAccountName] = useState('');
  const [notes, setNotes] = useState('');
const [filterStartDate, setFilterStartDate] = useState('');
const [filterEndDate, setFilterEndDate] = useState('');
const [filterKind, setFilterKind] = useState('todos');
const [filterCategoryId, setFilterCategoryId] = useState('todas');
const [reportMonth, setReportMonth] = useState(hojeLocal().slice(0, 7));
const [appearance, setAppearance] = useState({
  primary_color: '#172033',
  accent_color: '#E8B85B',
  font_family: 'Arial',
  theme: 'dark' as 'light' | 'dark' | 'system',
  button_style: 'rounded' as 'rounded' | 'square' | 'pill',
});

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryKind, setNewCategoryKind] =
    useState<CategoryKind>('entrada');

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getUser()
      .then(({ data, error }) => {
        if (error) {
          if (error && error.name !== 'AuthSessionMissingError') {
  setError('Não foi possível verificar a sessão.');
}
        }

        setUser(data.user);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Não foi possível verificar a sessão.');
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
  (_event, session) => {
    const nextUser = session?.user ?? null;

    setUser((currentUser) => {
      if (currentUser?.id === nextUser?.id) {
        return currentUser;
      }

      return nextUser;
    });
  }
);

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function carregarEmpresa() {
      if (!user) {
        setCompany(null);
        setCompanyCheckFailed(false);
        setLoadingCompany(false);
        return;
      }

      setLoadingCompany(true);
      setCompany(null);
      setCompanyCheckFailed(false);
      setError('');

      try {
        const supabase = getSupabase();

        const { data: membership, error: membershipError } =
          await supabase
            .from('company_members')
            .select('company_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

        if (membershipError) throw membershipError;

        if (!membership) {
          if (!cancelled) setCompany(null);
          return;
        }

        const { data: companyData, error: companyError } =
          await supabase
            .from('companies')
            .select('id, name')
            .eq('id', (membership as { company_id: string }).company_id)
            .maybeSingle();

        if (companyError) throw companyError;

        if (!companyData) {
          throw new Error('Empresa vinculada não encontrada.');
        }

        if (!cancelled) setCompany(companyData);
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setCompanyCheckFailed(true);
          setError(
            'Não foi possível verificar a empresa. Não tente criar outra enquanto esse erro aparecer.'
          );
        }
      } finally {
        if (!cancelled) setLoadingCompany(false);
      }
    }

    carregarEmpresa();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function carregarDados() {
      if (!company) {
        setCategories([]);
        setTransactions([]);
        setLoadingData(false);
        return;
      }

      setLoadingData(true);

      try {
        const dados = await buscarDadosEmpresa(company.id);

        if (!cancelled) {
          setCategories(dados.categories);
          setTransactions(dados.transactions);
          setError('');
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            'Não foi possível carregar os dados financeiros. Confira as políticas RLS do Supabase.'
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    carregarDados();

    return () => {
      cancelled = true;
    };
  }, [company]);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    setMessage('');

    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      setUser(data.user);
      setPassword('');
    } catch (err) {
      console.error(err);
      setError(
        'Não foi possível entrar. Confira o e-mail, a senha e a confirmação da conta.'
      );
    } finally {
      setSending(false);
    }
  }

  async function sair() {
    const { error } = await getSupabase().auth.signOut();

    if (error) {
      setError('Não foi possível sair. Tente novamente.');
    } else {
      setUser(null);
      setCompany(null);
      setCategories([]);
      setTransactions([]);
      setError('');
      setMessage('');
    }
  }

  async function criarEmpresa() {
    if (!user || creatingCompany) return;

    setCreatingCompany(true);
    setError('');
    setMessage('');

    try {
      const supabase = getSupabase();

      const { data: membership, error: membershipError } =
        await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

      if (membershipError) throw membershipError;

      if (membership) {
        setError(
          'Sua conta já possui vínculo com uma empresa. Atualize a página antes de continuar.'
        );
        return;
      }

     const { data: companyId, error: createError } =
  await (supabase as any).rpc('create_company', {
    company_name: companyName.trim(),
  });

      if (createError) throw createError;
      if (!companyId) throw new Error('O ID da empresa não foi retornado.');

      const { data: companyData, error: companyError } =
        await supabase
          .from('companies')
          .select('id, name')
          .eq('id', companyId)
          .single();

      if (companyError) throw companyError;

      setCompany(companyData);
      setMessage('Empresa criada e vinculada à sua conta.');
    } catch (err) {
      console.error(err);
      setError(
        'Não foi possível criar a empresa. Confira o erro no console antes de tentar novamente.'
      );
    } finally {
      setCreatingCompany(false);
    }
  }

  async function registrarLancamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !company || savingTransaction) return;

    const valor = Number(amount);

    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }

    if (!description.trim()) {
      setError('Informe a descrição do lançamento.');
      return;
    }


if (editingTransactionId) {
  setSavingTransaction(true);
  setError('');
  setMessage('');

  try {
    const { data: updated, error: updateError } = await (getSupabase() as any)
      .from('transactions')
      .update({
        kind,
        description: description.trim(),
        category_id: categoryId || null,
        amount: valor,
        occurred_on: occurredOn,
        payment_method: paymentMethod.trim() || null,
        account_name: accountName.trim() || null,
        notes: notes.trim() || null,
      })
      .eq('id', editingTransactionId)
      .eq('company_id', company.id)
      .select('id')
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      throw new Error('O lançamento não foi encontrado.');
    }

    const dados = await buscarDadosEmpresa(company.id);
    setCategories(dados.categories);
    setTransactions(dados.transactions);

    setDescription('');
    setAmount('');
    setOccurredOn(hojeLocal());
    setCategoryId('');
    setPaymentMethod('');
    setAccountName('');
    setNotes('');
    setEditingTransactionId(null);

    setMessage('Lançamento atualizado com sucesso.');
  } catch (err) {
    console.error(err);
    setError('Não foi possível atualizar o lançamento. Confira as permissões do Supabase.');
  } finally {
    setSavingTransaction(false);
  }

  return;
}
    setSavingTransaction(true);
    setError('');
    setMessage('');

    try {
      const { error: insertError } = await (getSupabase() as any)
        .from('transactions')
        .insert({
          company_id: company.id,
          kind,
          description: description.trim(),
          category_id: categoryId || null,
          amount: valor,
          occurred_on: occurredOn,
          payment_method: paymentMethod.trim() || null,
          account_name: accountName.trim() || null,
          responsible_user_id: user.id,
          notes: notes.trim() || null,
        });

      if (insertError) throw insertError;

      const dados = await buscarDadosEmpresa(company.id);
      setCategories(dados.categories);
      setTransactions(dados.transactions);

      setDescription('');
      setAmount('');
      setOccurredOn(hojeLocal());
      setCategoryId('');
      setPaymentMethod('');
      setAccountName('');
      setNotes('');

      setMessage('Lançamento registrado com sucesso.');
    } catch (err) {
      console.error(err);
      setError(
        'Não foi possível salvar o lançamento. Confira as permissões RLS e os dados informados.'
      );
    } finally {
      setSavingTransaction(false);
    }
  }

function iniciarEdicao(transaction: Transaction) {
  setEditingTransactionId(transaction.id);
  setKind(transaction.kind as TransactionKind);
  setDescription(transaction.description);
  setAmount(String(transaction.amount));
  setOccurredOn(transaction.occurred_on);
  setCategoryId(transaction.category_id ?? '');
  setPaymentMethod(transaction.payment_method ?? '');
  setAccountName(transaction.account_name ?? '');
  setNotes(transaction.notes ?? '');
  setError('');
  setMessage('Edite os campos do formulário e depois salve as alterações.');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


async function excluirLancamento(transaction: Transaction) {
  if (!company || deletingTransactionId) return;

  const confirmado = window.confirm(
    `Deseja excluir o lançamento "${transaction.description}" no valor de ${moeda.format(Number(transaction.amount))}?`
  );

  if (!confirmado) return;

  setDeletingTransactionId(transaction.id);
  setError('');
  setMessage('');

  try {
    const { error: deleteError } = await getSupabase()
      .from('transactions')
      .delete()
      .eq('id', transaction.id)
      .eq('company_id', company.id);

    if (deleteError) throw deleteError;

    const dados = await buscarDadosEmpresa(company.id);

    setCategories(dados.categories);
    setTransactions(dados.transactions);
    setMessage('Lançamento excluído com sucesso.');
  } catch (err) {
    console.error(err);
    setError(
      'Não foi possível excluir. Confirme as permissões da sua conta no Supabase.'
    );
  } finally {
    setDeletingTransactionId(null);
  }
}
  async function registrarCategoria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!company || savingCategory) return;

    if (newCategoryName.trim().length < 2) {
      setError('O nome da categoria precisa ter pelo menos 2 caracteres.');
      return;
    }

    setSavingCategory(true);
    setError('');
    setMessage('');

    try {
     const { data, error: insertError } = await (getSupabase() as any)
        .from('categories')
        .insert({
          company_id: company.id,
          name: newCategoryName.trim(),
          kind: newCategoryKind,
          active: true,
        })
        .select('id, company_id, name, kind, active')
        .single();

      if (insertError) throw insertError;

      setCategories((current) =>
        [...current, data as Category].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR')
        )
      );

      setNewCategoryName('');
      setMessage('Categoria cadastrada com sucesso.');
    } catch (err) {
      console.error(err);
      setError(
        'Não foi possível cadastrar a categoria. Verifique se já existe uma categoria com esse nome.'
      );
    } finally {
      setSavingCategory(false);
    }
  }

useEffect(() => {
  if (!company) return;

const companyId = company.id;
  let cancelled = false;

  async function carregarAparencia() {
    try {
      const supabase = getSupabase() as any;

      const { data, error } = await supabase
        .from('company_settings')
        .select(
          'primary_color, accent_color, font_family, theme, button_style'
        )
       .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;

      if (data && !cancelled) {
        setAppearance({
          primary_color: data.primary_color || '#172033',
          accent_color: data.accent_color || '#E8B85B',
          font_family: data.font_family || 'Arial',
          theme:
            data.theme === 'light' || data.theme === 'system'
              ? data.theme
              : 'dark',
          button_style:
            data.button_style === 'square' ||
            data.button_style === 'pill'
              ? data.button_style
              : 'rounded',
        });
      }
    } catch (err) {
      console.error('Erro ao carregar a aparência:', err);

      if (!cancelled) {
        setError('Não foi possível carregar as preferências visuais.');
      }
    }
  }

  carregarAparencia();

  return () => {
    cancelled = true;
  };
}, [company]);


  const entradas = transactions
    .filter((item) => item.kind === 'entrada')
    .reduce((total, item) => total + Number(item.amount), 0);

  const saidas = transactions
    .filter((item) => item.kind === 'saida')
    .reduce((total, item) => total + Number(item.amount), 0);

  const aportes = transactions
    .filter((item) => item.kind === 'aporte')
    .reduce((total, item) => total + Number(item.amount), 0);

  const retiradas = transactions
    .filter((item) => item.kind === 'retirada')
    .reduce((total, item) => total + Number(item.amount), 0);

  const saldo = entradas + aportes - saidas - retiradas;


useEffect(() => {
  const isDarkTheme = appearance.theme === 'dark';

  const oldBackground = document.body.style.backgroundColor;
  const oldColor = document.body.style.color;
  const oldFont = document.body.style.fontFamily;

  document.body.style.backgroundColor = isDarkTheme
    ? '#111827'
    : '#F8FAFC';

  document.body.style.color = isDarkTheme
    ? '#F9FAFB'
    : '#172033';

  document.body.style.fontFamily = appearance.font_family;

  return () => {
    document.body.style.backgroundColor = oldBackground;
    document.body.style.color = oldColor;
    document.body.style.fontFamily = oldFont;
  };
}, [appearance.theme, appearance.font_family]);


const reportTransactions = transactions.filter((item) =>
  item.occurred_on.startsWith(reportMonth)
);

const reportEntradas = reportTransactions
  .filter((item) => item.kind === 'entrada')
  .reduce((total, item) => total + Number(item.amount), 0);

const reportSaidas = reportTransactions
  .filter((item) => item.kind === 'saida')
  .reduce((total, item) => total + Number(item.amount), 0);

const reportAportes = reportTransactions
  .filter((item) => item.kind === 'aporte')
  .reduce((total, item) => total + Number(item.amount), 0);

const reportRetiradas = reportTransactions
  .filter((item) => item.kind === 'retirada')
  .reduce((total, item) => total + Number(item.amount), 0);

const reportSaldo =
  reportEntradas + reportAportes - reportSaidas - reportRetiradas;

const categoriasDisponiveis = categories.filter((category) => {
    if (!category.active) return false;
    if (kind === 'transferencia') return true;

    const tipoCompativel =
      kind === 'entrada' || kind === 'aporte' ? 'entrada' : 'saida';

    return category.kind === 'ambos' || category.kind === tipoCompativel;
  });


const filteredTransactions = transactions.filter((item) => {
  const matchesStartDate =
    !filterStartDate || item.occurred_on >= filterStartDate;

  const matchesEndDate =
    !filterEndDate || item.occurred_on <= filterEndDate;

  const matchesKind =
    filterKind === 'todos' || item.kind === filterKind;

  const matchesCategory =
    filterCategoryId === 'todas' ||
    item.category_id === filterCategoryId;

  return (
    matchesStartDate &&
    matchesEndDate &&
    matchesKind &&
    matchesCategory
  );
});

 function nomeTipo(tipo: string) {
    const nomes: Record<string, string> = {
      entrada: 'Receita',
      saida: 'Despesa',
      transferencia: 'Transferência',
      aporte: 'Aporte',
      retirada: 'Retirada',
    };

    return nomes[tipo] ?? tipo;
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Carregando...</main>;
  }

const isDark = appearance.theme === 'dark';

const pageBackground = isDark ? '#111827' : '#F8FAFC';
const pageText = isDark ? '#F9FAFB' : '#172033';
const surfaceBackground = isDark ? '#1F2937' : '#FFFFFF';
const borderColor = isDark ? '#374151' : '#E5E7EB';

const buttonRadius =
  appearance.button_style === 'pill'
    ? 999
    : appearance.button_style === 'square'
      ? 4
      : 10;

const cardStyle: React.CSSProperties = {
  border: `1px solid ${borderColor}`,
  borderRadius: 12,
  padding: 18,
  background: surfaceBackground,
  color: pageText,
};
 

 const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: appearance.primary_color,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: buttonRadius,
  padding: '10px 16px',
  fontFamily: appearance.font_family,
  fontWeight: 600,
  cursor: 'pointer',
};

const accentButtonStyle: React.CSSProperties = {
  backgroundColor: appearance.accent_color,
  color: '#172033',
  border: 'none',
  borderRadius: buttonRadius,
  padding: '10px 16px',
  fontFamily: appearance.font_family,
  fontWeight: 600,
  cursor: 'pointer',
};
const editActionStyle: React.CSSProperties = {
  background: surfaceBackground,
  color: pageText,
  border: `1px solid ${borderColor}`,
  borderRadius: buttonRadius,
  padding: '7px 12px',
  fontFamily: appearance.font_family,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const deleteActionStyle: React.CSSProperties = {
  background: '#FEF2F2',
  color: '#B91C1C',
  border: '1px solid #FECACA',
  borderRadius: buttonRadius,
  padding: '7px 12px',
  fontFamily: appearance.font_family,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 42,
  padding: '11px 13px',
  marginTop: 6,
  marginBottom: 16,
  border: `1px solid ${borderColor}`,
  borderRadius: 10,
  boxSizing: 'border-box',
  background: surfaceBackground,
  color: pageText,
  fontFamily: appearance.font_family,
  fontSize: 14,
  transition: 'border-color 150ms ease',
};


  return (
    <main
      style={{
        maxWidth: 1050,
        margin: '30px auto',
        padding: 20,
        fontFamily: appearance.font_family,
        color: pageText,
      }}
    >
      
<header
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    padding: '18px 22px',
    marginBottom: 24,
    background:
      appearance.theme === 'dark' ? '#172033' : '#FFFFFF',
    color: appearance.theme === 'dark' ? '#FFFFFF' : '#172033',
    border: `1px solid ${borderColor}`,
    borderRadius: 18,
    boxShadow:
      appearance.theme === 'dark'
        ? '0 12px 30px rgba(0,0,0,0.16)'
        : '0 8px 24px rgba(15,23,42,0.06)',
  }}
>
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <div
      style={{
        width: 48,
        height: 48,
        flexShrink: 0,
        borderRadius: 14,
        background: appearance.accent_color,
        color: appearance.primary_color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 17,
        letterSpacing: '-1px',
      }}
    >
      SF
    </div>

    <div>
      <h1
        style={{
          margin: '0 0 4px',
          fontSize: 24,
          letterSpacing: '-0.6px',
          color: appearance.theme === 'dark' ? '#FFFFFF' : '#172033',
        }}
      >
        Controle financeiro
      </h1>

      <p
        style={{
          margin: 0,
          fontSize: 14,
          color: appearance.theme === 'dark' ? '#CBD5E1' : '#64748B',
        }}
      >
        {company?.name ?? 'STORE FINCH'} · Gestão financeira
      </p>
    </div>
  </div>

  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    }}
  >
    {user && (
      <a
        href="/configuracoes"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '10px 14px',
          border: `1px solid ${borderColor}`,
          borderRadius: buttonRadius,
          background: surfaceBackground,
          color: pageText,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        ⚙ Configurações
      </a>
    )}

    {user && (
      <button onClick={sair} style={primaryButtonStyle}>
        Sair da conta
      </button>
    )}
  </div>
</header>


      <div
  style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: 24,
    flexWrap: 'wrap',
  }}
>
  {user && (
    <aside
      style={{
        flex: '0 1 220px',
        minWidth: 190,
        position: 'sticky',
        top: 20,
        background: surfaceBackground,
        color: pageText,
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <h3 style={{ margin: '4px 0 16px' }}>Navegação</h3>

      <nav style={{ display: 'grid', gap: 8 }}>
        {[
          { label: 'Painel', href: '#overview', icon: '⌂' },
          { label: 'Resumo mensal', href: '#monthly', icon: '▤' },
          { label: 'Lançamentos', href: '#new-transaction', icon: '+' },
          { label: 'Categorias', href: '#categories', icon: '◈' },
          { label: 'Histórico', href: '#history', icon: '↕' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 12px',
              borderRadius: buttonRadius,
              background: 'transparent',
              border: `1px solid ${borderColor}`,
              color: pageText,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                color: appearance.accent_color,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {item.icon}
            </span>
            {item.label}
          </a>
        ))}

        <a
          href="/configuracoes"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 12px',
            borderRadius: buttonRadius,
            background: appearance.primary_color,
            color: '#FFFFFF',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span>⚙</span>
          Configurações
        </a>
      </nav>
    </aside>
  )}

  <div style={{ flex: '1 1 620px', minWidth: 0 }}>{error && (
        <p
          role="alert"
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 12,
          }}
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          style={{
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            padding: 12,
          }}
        >
          {message}
        </p>
      )}

      {!user ? (
        <section style={cardStyle}>
          <h2>Entrar na sua conta</h2>

          <form onSubmit={entrar}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />

            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />

            <button
  type="submit"
  disabled={sending}
  style={primaryButtonStyle}
>
              {sending ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </section>
      ) : loadingCompany ? (
        <p>Verificando a empresa vinculada à sua conta...</p>
      ) : companyCheckFailed ? (
        <p>
          Não foi possível verificar o vínculo com a empresa. Corrija o erro
          antes de tentar criar uma empresa.
        </p>
      ) : !company ? (
        <section style={cardStyle}>
          <h2>Cadastrar a empresa</h2>
          <p>Conta conectada: {user.email}</p>

          <label htmlFor="companyName">Nome da empresa</label>
          <input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            minLength={2}
            maxLength={120}
            required
            style={inputStyle}
          />

          <button
            onClick={criarEmpresa}
            disabled={creatingCompany || companyName.trim().length < 2}
          >
            {creatingCompany ? 'Criando...' : 'Criar empresa'}
          </button>
        </section>
      ) : (
        <>
          <section style={{ ...cardStyle, marginBottom: 22 }}>
           <h2 id="overview" style={{ marginTop: 0 }}>{company.name}</h2>
            <p style={{ marginBottom: 0, color: '#64748b' }}>
              Conta conectada: {user.email}
            </p>
          </section>

<section style={{ ...cardStyle, marginBottom: 22 }}>
 <h2 id="monthly" style={{ marginTop: 0 }}>Resumo financeiro mensal</h2>

  <label htmlFor="reportMonth">Mês do relatório</label>
  <input
    id="reportMonth"
    type="month"
    value={reportMonth}
    onChange={(e) => setReportMonth(e.target.value)}
    style={{ ...inputStyle, maxWidth: 260 }}
  />

  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 14,
      marginTop: 12,
    }}
  >
    <div style={cardStyle}>
      <p style={{ margin: 0, color: '#64748b' }}>Saldo do mês</p>
      <h2 style={{ marginBottom: 0 }}>
        {moeda.format(reportSaldo)}
      </h2>
    </div>

    <div style={cardStyle}>
      <p style={{ margin: 0, color: '#64748b' }}>Receitas do mês</p>
      <h2 style={{ marginBottom: 0, color: '#15803d' }}>
        {moeda.format(reportEntradas)}
      </h2>
    </div>

    <div style={cardStyle}>
      <p style={{ margin: 0, color: '#64748b' }}>Despesas do mês</p>
      <h2 style={{ marginBottom: 0, color: '#b91c1c' }}>
        {moeda.format(reportSaidas)}
      </h2>
    </div>

    <div style={cardStyle}>
      <p style={{ margin: 0, color: '#64748b' }}>Aportes do mês</p>
      <h2 style={{ marginBottom: 0 }}>
        {moeda.format(reportAportes)}
      </h2>
    </div>

    <div style={cardStyle}>
      <p style={{ margin: 0, color: '#64748b' }}>Retiradas do mês</p>
      <h2 style={{ marginBottom: 0 }}>
        {moeda.format(reportRetiradas)}
      </h2>
    </div>
  </div>
</section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14,
              marginBottom: 26,
            }}
          >
            <div style={cardStyle}>
              <p style={{ margin: 0, color: '#64748b' }}>Saldo estimado</p>
              <h2 style={{ marginBottom: 0 }}>{moeda.format(saldo)}</h2>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: 0, color: '#64748b' }}>Receitas</p>
              <h2 style={{ marginBottom: 0, color: '#15803d' }}>
                {moeda.format(entradas)}
              </h2>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: 0, color: '#64748b' }}>Despesas</p>
              <h2 style={{ marginBottom: 0, color: '#b91c1c' }}>
                {moeda.format(saidas)}
              </h2>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: 0, color: '#64748b' }}>Aportes</p>
              <h2 style={{ marginBottom: 0 }}>{moeda.format(aportes)}</h2>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: 0, color: '#64748b' }}>Retiradas</p>
              <h2 style={{ marginBottom: 0 }}>{moeda.format(retiradas)}</h2>
            </div>
          </section>

          <section style={{ ...cardStyle, marginBottom: 22 }}>
            <h2 id="new-transaction" style={{ marginTop: 0 }}>Novo lançamento</h2>

            <form onSubmit={registrarLancamento}>
              <label htmlFor="kind">Tipo de lançamento</label>
              <select
                id="kind"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as TransactionKind);
                  setCategoryId('');
                }}
                style={inputStyle}
              >
                <option value="entrada">Receita</option>
                <option value="saida">Despesa</option>
                <option value="aporte">Aporte</option>
                <option value="retirada">Retirada</option>
                <option value="transferencia">Transferência</option>
              </select>

              <label htmlFor="description">Descrição</label>
              <input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                placeholder="Ex.: venda de produto"
                required
                style={inputStyle}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                <div>
                  <label htmlFor="amount">Valor (R$)</label>
                  <input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="occurredOn">Data</label>
                  <input
                    id="occurredOn"
                    type="date"
                    value={occurredOn}
                    onChange={(e) => setOccurredOn(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <label htmlFor="category">Categoria (opcional)</label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Sem categoria</option>
                {categoriasDisponiveis.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <label htmlFor="paymentMethod">Forma de pagamento (opcional)</label>
              <input
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="Ex.: Pix, cartão, dinheiro"
                style={inputStyle}
              />

              <label htmlFor="accountName">Conta (opcional)</label>
              <input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ex.: conta bancária, caixa"
                style={inputStyle}
              />

              <label htmlFor="notes">Observações (opcional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={inputStyle}
              />

              <button
  type="submit"
  disabled={savingTransaction}
  style={primaryButtonStyle}
>
               {savingTransaction
  ? 'Salvando...'
  : editingTransactionId
    ? 'Salvar alterações'
    : 'Salvar lançamento'}
              </button>

{editingTransactionId && (
  <button
    type="button"
    disabled={savingTransaction}
    onClick={() => {
      setEditingTransactionId(null);
      setKind('entrada');
      setDescription('');
      setAmount('');
      setOccurredOn(hojeLocal());
      setCategoryId('');
      setPaymentMethod('');
      setAccountName('');
      setNotes('');
      setError('');
      setMessage('Edição cancelada.');
    }}
    style={{ marginLeft: 8 }}
  >
    Cancelar edição
  </button>
)}

            </form>
          </section>

          <section style={{ ...cardStyle, marginBottom: 22 }}>
            <h2 id="categories" style={{ marginTop: 0 }}>Categorias</h2>

            <form onSubmit={registrarCategoria}>
              <label htmlFor="newCategoryName">Nome da categoria</label>
              <input
                id="newCategoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex.: vendas, aluguel, frete"
                maxLength={100}
                required
                style={inputStyle}
              />

              <label htmlFor="newCategoryKind">Tipo de categoria</label>
              <select
                id="newCategoryKind"
                value={newCategoryKind}
                onChange={(e) =>
                  setNewCategoryKind(e.target.value as CategoryKind)
                }
                style={inputStyle}
              >
                <option value="entrada">Receita</option>
                <option value="saida">Despesa</option>
                <option value="ambos">Receita e despesa</option>
              </select>

              <button
  type="submit"
  disabled={savingCategory}
  style={primaryButtonStyle}
>
                {savingCategory ? 'Salvando...' : 'Cadastrar categoria'}
              </button>
            </form>

            {categories.length === 0 ? (
              <p style={{ color: '#64748b' }}>
                Nenhuma categoria cadastrada ainda.
              </p>
            ) : (
              <ul>
                {categories.map((category) => (
                  <li key={category.id}>
                    {category.name} —{' '}
                    {category.kind === 'entrada'
                      ? 'Receita'
                      : category.kind === 'saida'
                        ? 'Despesa'
                        : 'Receita e despesa'}
                    {!category.active && ' (inativa)'}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={cardStyle}>

<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 18,
  }}
>
  <div>
    <label htmlFor="filterStartDate">Data inicial</label>
    <input
      id="filterStartDate"
      type="date"
      value={filterStartDate}
      onChange={(e) => setFilterStartDate(e.target.value)}
      style={inputStyle}
    />
  </div>

  <div>
    <label htmlFor="filterEndDate">Data final</label>
    <input
      id="filterEndDate"
      type="date"
      value={filterEndDate}
      onChange={(e) => setFilterEndDate(e.target.value)}
      style={inputStyle}
    />
  </div>

  <div>
    <label htmlFor="filterKind">Tipo de lançamento</label>
    <select
      id="filterKind"
      value={filterKind}
      onChange={(e) => setFilterKind(e.target.value)}
      style={inputStyle}
    >
      <option value="todos">Todos os tipos</option>
      <option value="entrada">Receitas</option>
      <option value="saida">Despesas</option>
      <option value="aporte">Aportes</option>
      <option value="retirada">Retiradas</option>
      <option value="transferencia">Transferências</option>
    </select>
  </div>

  <div>
    <label htmlFor="filterCategoryId">Categoria</label>
    <select
      id="filterCategoryId"
      value={filterCategoryId}
      onChange={(e) => setFilterCategoryId(e.target.value)}
      style={inputStyle}
    >
      <option value="todas">Todas as categorias</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  </div>
</div>

<button
  type="button"
  onClick={() => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterKind('todos');
    setFilterCategoryId('todas');
  }}
  style={{ marginBottom: 18 }}
>
  Limpar filtros
</button>
 <h2 id="history" style={{ marginTop: 0 }}>Histórico de lançamentos</h2>

            {loadingData ? (
              <p>Carregando lançamentos...</p>
            ) :filteredTransactions.length === 0? (
              <p style={{ color: '#64748b' }}>
                Nenhum lançamento cadastrado. Use o formulário acima para
                registrar o primeiro.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>
                        Data
                      </th>
                      <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>
                        Descrição
                      </th>
                      <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>
                        Tipo
                      </th>
                      <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>
                        Categoria
                      </th>
                      <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>
                        Valor
                      </th>
                   <th style={{ padding: 10, borderBottom: '1px solid #ddd' }}>
  Ações
</th>
</tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map((item) => {
                      const categoria = categories.find(
                        (category) => category.id === item.category_id
                      );

                      return (
                        <tr key={item.id}>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {new Date(
                              `${item.occurred_on}T00:00:00`
                            ).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {item.description}
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {nomeTipo(item.kind)}
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
                            {categoria?.name ?? 'Sem categoria'}
                          </td>
                          <td style={{ padding: 10, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>
                            {moeda.format(Number(item.amount))}
                          </td>
                        <td style={{ padding: 10, borderBottom: '1px solid #eee' }}>
  <button
  onClick={() => iniciarEdicao(item)}
  disabled={
    editingTransactionId !== null ||
    deletingTransactionId !== null
  }
  style={{ ...editActionStyle, marginRight: 8 }}
>
  Editar
</button>
<button
    onClick={() => excluirLancamento(item)}
    disabled={deletingTransactionId !== null}style={deleteActionStyle}
  >
    {deletingTransactionId === item.id ? 'Excluindo...' : 'Excluir'}
  </button>
</td>
</tr>                   );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p style={{ fontSize: 12, color: '#64748b', marginTop: 16 }}>
              O saldo considera receitas e aportes menos despesas e retiradas.
              Transferências ficam fora do cálculo até definirmos como registrar
              sua origem e destino.
            </p>
          </section>
        </>
      )}
  </div>
</div>
    </main>
  );
}

update public.company_settings
set
  legal_name = '44.810.038 Leonardo Candido Vasconcelos',
  trade_name = 'SEG VISIOM',
  document = '44.810.038/0001-03',
  phone = '(62) 8443-4663',
  email = 'leonardocv796@gmail.com',
  street = 'R. Valença',
  number = '188',
  complement = 'Quadra 111; Lote 16',
  district = 'Setor Leste Universitário',
  city = 'Goiânia',
  state = 'GO',
  postal_code = '74615-280',
  responsible_name = 'Leonardo Cândido Vasconcelos',
  updated_at = now()
where id = true;

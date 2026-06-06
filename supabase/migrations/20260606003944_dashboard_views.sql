create view public.v_service_financials
with (security_invoker = true)
as
select
  s.id as service_id,
  s.title,
  s.client_id,
  s.service_type_id,
  s.status,
  s.sale_amount,
  s.estimated_cost_amount,
  coalesce(sum(sc.amount), 0)::numeric(12,2) as real_cost_amount,
  (s.sale_amount - coalesce(sum(sc.amount), 0))::numeric(12,2) as real_margin_amount,
  case
    when s.sale_amount = 0 then 0
    else round(((s.sale_amount - coalesce(sum(sc.amount), 0)) / s.sale_amount) * 100, 2)
  end as real_margin_percent
from public.services s
left join public.service_costs sc on sc.service_id = s.id
group by s.id;

create view public.v_dashboard_monthly
with (security_invoker = true)
as
select
  date_trunc('month', s.created_at)::date as report_month,
  count(*) as service_count,
  count(*) filter (where s.status = 'ORCAMENTO') as budget_count,
  count(*) filter (where s.status = 'FINALIZADO') as finished_count,
  coalesce(sum(s.sale_amount) filter (
    where s.status in ('EM_EXECUCAO', 'GARANTIA', 'FINALIZADO')
  ), 0)::numeric(14,2) as revenue_amount,
  coalesce(sum(f.real_cost_amount), 0)::numeric(14,2) as real_cost_amount,
  coalesce(sum(f.real_margin_amount), 0)::numeric(14,2) as real_margin_amount
from public.services s
join public.v_service_financials f on f.service_id = s.id
group by date_trunc('month', s.created_at);

create view public.v_services_by_status
with (security_invoker = true)
as
select status, count(*) as service_count
from public.services
group by status;

grant select on public.v_service_financials to authenticated;
grant select on public.v_dashboard_monthly to authenticated;
grant select on public.v_services_by_status to authenticated;

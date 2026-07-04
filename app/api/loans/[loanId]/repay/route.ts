type RouteContext = {
  params: Promise<{ loanId: string }>;
};

export async function POST(_request: Request, _ctx: RouteContext) {
  return Response.json({ error: "not_implemented" }, { status: 501 });
}

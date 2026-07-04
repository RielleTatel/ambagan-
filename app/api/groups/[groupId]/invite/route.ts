type RouteContext = {
  params: Promise<{ groupId: string }>;
};

export async function POST(_request: Request, _ctx: RouteContext) {
  return Response.json({ error: "not_implemented" }, { status: 501 });
}

export async function DELETE(_request: Request, _ctx: RouteContext) {
  return Response.json({ error: "not_implemented" }, { status: 501 });
}

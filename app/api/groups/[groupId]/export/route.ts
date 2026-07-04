type RouteContext = {
  params: Promise<{ groupId: string }>;
};

export async function GET(_request: Request, _ctx: RouteContext) {
  return Response.json({ error: "not_implemented" }, { status: 501 });
}

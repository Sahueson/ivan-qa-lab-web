import { getTools } from '@/lib/tools';
import Navbar, { type NavTool } from './Navbar';

// El menú sale de la tabla `tools`: una herramienta nueva aparece sola, en el desplegable de su
// categoría (tools.category), sin tocar el código del menú.
export default async function NavbarServer() {
  const tools: NavTool[] = (await getTools()).filter((t) => t.enabled).map((t) => ({
    slug: t.slug,
    name: t.name,
    category: t.category ?? 'otros',
    live: Boolean(t.live_execution),
  }));
  return <Navbar tools={tools} />;
}

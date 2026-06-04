# `@pppicado/redim-frame`

> Librería Angular de ventanas flotantes redimensionables y modales (Angular CDK + virtual-scrollbar).
> Documentación unificada en español: [`../../docs/`](../../docs/README.md).

## 📚 Documentación

Toda la información de este submódulo está centralizada en:

| Recurso | Enlace |
| :--- | :--- |
| **Estado** | [`../../docs/estado/redim-frame.md`](../../docs/estado/redim-frame.md) |
| **Planificación** | [`../../docs/planificacion/redim-frame.md`](../../docs/planificacion/redim-frame.md) |
| **Errores** | [`../../docs/errores/redim-frame.md`](../../docs/errores/redim-frame.md) |
| **Arquitectura** | [`../../docs/documentacion/arquitectura.md`](../../docs/documentacion/arquitectura.md) |
| **Testing** | [`../../docs/documentacion/testing.md`](../../docs/documentacion/testing.md) |
| **Build** | [`../../docs/documentacion/build-y-despliegue.md`](../../docs/documentacion/build-y-despliegue.md) |

## Inicio Rápido

```bash
# Compilar (requiere virtual-scrollbar antes)
npm run build:scrollbar
npm run build:windows
```

```typescript
import { RedimFrameService, RedimFrameModule } from '@pppicado/redim-frame';

@NgModule({
  imports: [RedimFrameModule]
})
export class AppModule {}

@Component({ ... })
export class AppComponent {
  constructor(private svc: RedimFrameService) {}

  openWindow() {
    // Firma correcta: openWindows(type, component, config?)
    this.svc.openWindows('window', MyComponent, {
      width: 50, height: 40, x: 25, y: 30,
      windowData: { message: 'Hola' }
    });
  }

  openModal() {
    this.svc.openWindows('modal', MyComponent, {
      width: 60, height: 50,
      windowData: { title: 'Modal' },
      hasBackdrop: true
    });
  }
}
```

## Resumen Ejecutivo

- **Tipo:** Librería Angular (NgModule, CDK overlay + portal + drag).
- **Peer deps:** `@angular/{common,core,cdk}`, `@pppicado/virtual-scrollbar`, `bootstrap`.
- **Estado:** 🟡 En desarrollo — service sin `closeAll()`, leaks en resize, modal sin cleanup.
- **Bugs verificados (2026-06-04):** 1/14 del plan arreglado (CR-03), 1 parcial (CR-01), 12 pendientes. 12 R nuevos. 4 bugs de docs (ejemplos del README no compilan).
- **Tests:** 23 specs creados (2026-06-04) + 3 e2e Playwright.

⚠️ **Aviso importante:** los ejemplos del README antiguo (ahora borrado) tenían **firma incorrecta** (`openWindows` con 2 args y método inexistente `openModal`). La documentación centralizada en [`../../docs/errores/redim-frame.md`](../../docs/errores/redim-frame.md) detalla D1-D4.

Ver [`../../docs/estado/redim-frame.md`](../../docs/estado/redim-frame.md) para detalle completo.

## Licencia

MIT

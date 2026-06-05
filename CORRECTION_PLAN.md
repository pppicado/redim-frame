# Plan de Corrección — `@pppicado/redim-frame`

> **Versión:** 2026-06-04
> **Submódulo:** `projects/redim-frame` (Angular CDK overlay + portal + drag-drop)
> **Plan autocontenido** — no redirige a docs centralizados.
> Documentación complementaria en [`../../docs/errores/redim-frame.md`](../../docs/errores/redim-frame.md) y [`../../docs/estado/redim-frame.md`](../../docs/estado/redim-frame.md).

---

## Archivos Analizados (2026-06-04)

| Ruta | Líneas | Rol |
| :--- | ---: | :--- |
| `projects/redim-frame/src/lib/redim-frame.service.ts` | 170 | Servicio principal (z-index, registry, lifecycle) |
| `projects/redim-frame/src/lib/base-window.directive.ts` | 164 | Directiva base (resize observers, CSS vars, dispose) |
| `projects/redim-frame/src/lib/floating-window/floating-window.component.ts` | 112 | Ventana flotante (drag + resize) |
| `projects/redim-frame/src/lib/modal-window/modal-window.component.ts` | 13 | Modal (wrapper) |
| `projects/redim-frame/src/lib/redim-frame.interface.ts` | 221 | Tipos, `WindowConfig`, `RfRect`, `UnitGroupFactory` |
| `projects/redim-frame/src/lib/redim-frame.module.ts` | — | NgModule |
| `projects/redim-frame/src/lib/floating-window/floating-window.component.html` | — | Template |
| `projects/redim-frame/src/lib/modal-window/modal-window.component.html` | — | Template |
| `projects/redim-frame/README.md` | 72 | Documentación (con bugs D1-D4) |
| `projects/redim-frame/src/lib/redim-frame.service.spec.ts` | — | Specs service (12 `it`) |
| `projects/redim-frame/src/lib/floating-window/floating-window.component.spec.ts` | — | Specs floating (11 `it`) |
| `projects/redim-frame/src/lib/modal-window/modal-window.component.spec.ts` | — | Specs modal (5 `it`) |
| `tests/e2e/redim-frame/floating-window-drag.spec.ts` | 55 | e2e Playwright drag |
| `tests/e2e/redim-frame/floating-window-resize.spec.ts` | — | e2e Playwright resize |
| `tests/e2e/redim-frame/modal-window.spec.ts` | — | e2e Playwright modal |
| `docs/errores/redim-frame.md` | 190 | Inventario centralizado (referencia) |

**Totales:** 6 archivos `.ts` de lib, 2 templates, 1 CSS module, 3 specs, 3 e2e, 2 docs.

---

## Tabla de Contenidos

1. [Errores Críticos Originales (CR-01..CR-09)](#errores-críticos-originales-cr-01cr-09)
2. [Errores Importantes Originales (IM-01..IM-04)](#errores-importantes-originales-im-01im-04)
3. [Errores Menores Originales (MN-04)](#errores-menores-originales-mn-04)
4. [Bugs Nuevos (R1–R12)](#bugs-nuevos-r1r12)
5. [Bugs de Documentación (D1–D4)](#bugs-de-documentación-d1d4)
6. [Plan de Acción Recomendado (4 fases)](#plan-de-acción-recomendado)
7. [Tabla Resumen de Verificación](#tabla-resumen-de-verificación)
8. [Notas Arquitectónicas](#notas-arquitectónicas)

---

## Errores Críticos Originales (CR-01..CR-09)

### CR-01 — `BaseWindowDirective.ngOnDestroy` vacío
- **Archivo:línea:** `base-window.directive.ts:158` (verificado)
- **Estado verificado 2026-06-04:** 🟡 **PARCIAL**
- **Detalle:** El `ngOnDestroy` actual ya invoca el cleanup del array `observers` (ResizeObserver + Subscription), pero el nuevo `FloatingWindowComponent` añade listeners de `Renderer2` (`mousemove`/`mouseup`) que **no se registran en `observers`** y, por tanto, **no se limpian**. Ver R2.
- **Diff conceptual del fix completo:**
  ```typescript
  // base-window.directive.ts
  ngOnDestroy() {
    while (this.observers.length) {
      const obs = this.observers.pop();
      obs?.dis?.();
    }
  }
  // R2 complementa registrando los listeners de Renderer2 aquí.
  ```

### CR-02 — `closeWindow` no notifica al componente
- **Archivo:línea:** `service.ts:154-169` (función `closeWindow`)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** La rama `close` de `EventEmitter` en `setupSubscriptions` (línea 47) sí libera z-index, dispose overlay y borra registry, pero `closeWindow(componentRef)` invocado desde fuera **no emite `change({ type: 'close' })`**. El usuario espera que la ventana reaccione con su `onClose` handler.
- **Fix pendiente:**
  ```typescript
  closeWindow(componentRef: ComponentRef<any>): void {
    const entry = this.windowRegistry.get(componentRef);
    if (entry) {
      componentRef.instance.change.emit({ type: 'close' });
      // el handler en setupSubscriptions hará el resto
    }
  }
  ```

### CR-03 — `closeWindow` no remueve entrada de `windowRegistry`
- **Archivo:línea:** `service.ts:166`
- **Estado verificado 2026-06-04:** ✅ **ARREGLADO**
- **Detalle:** Línea 166 contiene `this.windowRegistry.delete(componentRef);` — fix confirmado. Esta era la fuga de memoria más grave del servicio.

### CR-04 — `TemplatePortal` con `null!` como `ViewContainerRef`
- **Archivo:línea:** `service.ts:112`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** `new TemplatePortal(componentOrTemplate, null!, { $implicit: config?.windowData } as any)` usa un `ViewContainerRef` nulo con non-null assertion. Funciona porque CDK infiere el VCR del contexto, pero rompe tipado estricto y puede petar en SSR.
- **Fix pendiente:**
  ```typescript
  if (componentOrTemplate instanceof TemplateRef) {
    const vcr = this.injector.get(ViewContainerRef); // pedir VCR al injector
    userPortal = new TemplatePortal(componentOrTemplate, vcr, { $implicit: config?.windowData });
  }
  ```

### CR-05 — Subscriptions duplicadas en `setupSubscriptions`
- **Archivo:línea:** `service.ts:44-67`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** Dos `.subscribe()` independientes sobre el mismo `EventEmitter change`. Cualquier reasignación o nueva creación duplica handlers.
- **Fix pendiente:**
  ```typescript
  const subs: Subscription[] = [
    windowInstance.change.subscribe((event) => {
      if (event.type === 'close')      { /* cleanup */ }
      else if (event.type === 'focus') { /* z-index */ }
    })
  ];
  ```

### CR-06 — `initResize` sin `mouseleave`/`blur`
- **Archivo:línea:** `floating-window.component.ts:41-62`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** Si el usuario suelta el botón fuera de la ventana o cambia de pestaña durante un resize, `mouseup` puede no dispararse y `isResizing` queda en `true` para siempre.
- **Fix pendiente:**
  ```typescript
  this.unlistenMouseUp = this.renderer.listen('document', 'mouseup', () => this.stopResize());
  this.unlistenMouseLeave = this.renderer.listen('document', 'mouseleave', () => this.stopResize());
  this.unlistenBlur = this.renderer.listen('window', 'blur', () => this.stopResize());
  ```

### CR-07 — `onPortalAttached` sin `typeof` guard
- **Archivo:línea:** `base-window.directive.ts:135-143`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** El `if (ref instanceof ComponentRef)` es correcto, pero `setInput(key, ...)` puede asignar a un `Input` no inicializado si la key no existe (`'key' in ref.instance` solo protege de escritura, no de orden de `ngOnInit`).
- **Fix pendiente:** diferir con `queueMicrotask` o usar `setInput` tras `detectChanges()` del host.

### CR-08 — `openWindows` sin validación de `componentOrTemplate`
- **Archivo:línea:** `service.ts:69`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** Si llega `null`/`undefined` o un `Type<unknown>` sin decorador `@Component`, el portal explota tarde con error críptico.
- **Fix pendiente:**
  ```typescript
  if (!componentOrTemplate) throw new Error('[redim-frame] componentOrTemplate is required');
  if (!(componentOrTemplate instanceof TemplateRef) && typeof componentOrTemplate !== 'function') {
    throw new Error('[redim-frame] expected Type<T> or TemplateRef<T>');
  }
  ```

### CR-09 — `ModalWindowComponent` sin `ngOnDestroy`
- **Archivo:línea:** `modal-window.component.ts` (clase entera, 13 líneas)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** Aunque hereda de `BaseWindowDirective` (que sí tiene `ngOnDestroy`), si en el futuro se añade estado propio se duplicará el riesgo. Además, la clase no implementa explícitamente el ciclo de vida.
- **Fix pendiente:** implementar `OnDestroy` y delegar, o documentar el contrato. (R3 amplía.)

---

## Errores Importantes Originales (IM-01..IM-04)

### IM-01 — `zIndexCounter` crece sin límite
- **Archivo:línea:** `service.ts:23` (declaración) + `service.ts:60` (incremento en focus)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE** (duplica R11)
- **Detalle:** Cada focus de cualquier ventana hace `this.zIndexCounter++` sin devolver el índice al pool. Tras N focuses, el contador llega a miles aunque solo haya 2 ventanas abiertas.
- **Fix pendiente:** usar `acquireZIndex()` / `releaseZIndex()` también en el evento `focus`, no solo en `close`.

### IM-02 — `change.emit({type:'resize'})` en cada `mousemove`
- **Archivo:línea:** `floating-window.component.ts:92`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** Emite 60+ eventos/seg durante un resize manual; los consumidores (telemetría, autosave) reciben tormenta.
- **Fix pendiente:** throttle/debounce con `requestAnimationFrame` o `auditTime(16)`.

### IM-03 — Modal `mousedown` acepta right/middle click
- **Archivo:línea:** `modal-window.component.html:1` (atributo de host binding)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** El template del modal suele tener `(mousedown)="onWindowClick()"` o similar. Cualquier botón (right/middle) dispara `focus`, que es un side-effect inesperado.
- **Fix pendiente:** filtrar `event.button === 0` (solo left click).

### IM-04 — `hasBackdrop` compartido, ignorado para floating
- **Archivo:línea:** `redim-frame.interface.ts:40` (campo `hasBackdrop: boolean = false`)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** El campo vive en `WindowConfig` (compartido por window y modal), pero el servicio en `service.ts:79` solo lo aplica al type `modal`. Para `type === 'window'`, pasarlo es silenciosamente ignorado, lo que confunde a usuarios.
- **Fix pendiente:** o separar `FloatingWindowConfig` / `ModalWindowConfig`, o documentar que se ignora para `window`.

---

## Errores Menores Originales (MN-04)

### MN-04 — Modal expone `resizeBorder` sin handles de resize
- **Archivo:línea:** `modal-window.component.html`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE** (decisión UX pendiente)
- **Detalle:** `WindowConfig.resizeBorder` (default `'1vw'`) está disponible como `@Input` en el `BaseWindowDirective`, pero el template del modal no renderiza los handles (`.drag-handle-e`, `.drag-handle-s`, etc.). Por tanto el input existe pero no tiene efecto.
- **Decisión UX pendiente:**
  - **(a)** Intencional — modal no redimensionable, ocultar el input en el modal.
  - **(b)** Bug — añadir handles al template del modal para hacerlo redimensionable.
- **Recomendación:** documentar contrato en el JSDoc de `ModalWindowComponent` hasta resolver.

---

## Bugs Nuevos (R1–R12)

> Descubiertos durante el análisis cruzado del 2026-06-04.

### R1 — `closeAll()` no existe en el servicio ⏳
- **Archivo:línea:** `service.ts` (falta)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** El servicio expone `closeWindow(ref)` pero no `closeAll()`. Una SPA no puede cerrar masivamente al hacer logout / navegar.
- **Fix pendiente:**
  ```typescript
  closeAll(): void {
    this.windowRegistry.forEach((_, ref) => this.closeWindow(ref));
  }
  // o, mejor, iterar sobre el Map de keys.
  ```

### R2 — Renderer2 listeners no se limpian 🔴
- **Archivo:línea:** `floating-window.component.ts:18-19` (campos `unlistenMouseMove` / `unlistenMouseUp`) + llamadas en líneas 56, 59
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE** (CRÍTICO)
- **Detalle:** `initResize` registra dos listeners globales en `document` mediante `Renderer2.listen(...)`. `stopResize` los libera *si se llama*, pero si el componente muere durante un resize (p.ej. por `closeWindow`), `stopResize` nunca corre y los listeners quedan vivos: fuga de memoria + callbacks zombi.
- **Fix pendiente:** mover ambos unlisten al array `observers` del `BaseWindowDirective` para que `ngOnDestroy` los limpie.

### R3 — `ModalWindowComponent` sin `ngOnDestroy` 🔴
- **Archivo:línea:** `modal-window.component.ts` (no implementa `OnDestroy`)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE** (CRÍTICO)
- **Detalle:** Aunque la herencia le da el cleanup del padre, `ModalWindowComponent` no implementa `OnDestroy` explícitamente ni tiene `super.ngOnDestroy()` defensivo. Si en el futuro alguien añade recursos propios (p.ej. `Subject<void>`), se repite el bug de R2.
- **Fix pendiente:**
  ```typescript
  export class ModalWindowComponent extends BaseWindowDirective implements OnDestroy {
    ngOnDestroy() { super.ngOnDestroy?.(); }
  }
  ```

### R4 — Acceso a `_dragRef` privado del CDK 🟡
- **Archivo:línea:** `floating-window.component.ts:35`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** `event.source._dragRef.reset()` accede a un miembro privado (`_dragRef`) del CDK DragRef. Funciona hoy, pero rompe en upgrades de `@angular/cdk`.
- **Fix pendiente:** usar API pública — el `event.source` ya es un `CdkDrag`, y basta con `event.source.reset()` o `event.source.getFreeDragPosition()`. Si `_dragRef` es inevitable, envolver en `(cdkDrag as any)._dragRef` con comentario `// @ts-expect-error`.

### R5 — `dispose()` llama `this.ngOnDestroy()` directo 🔴
- **Archivo:línea:** `base-window.directive.ts:145-150`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE** (CRÍTICO)
- **Detalle:** `dispose()` invoca `this.ngOnDestroy()` manualmente, pero en Angular `ngOnDestroy` está pensado para ser invocado **una sola vez** por el framework. Llamarlo desde `dispose()` y luego dejar que el framework también lo invoque → doble cleanup, posible `Cannot read properties of undefined` al re-entrar a `observers.pop()`.
- **Fix pendiente:**
  ```typescript
  dispose(emit: boolean = true): void {
    if (this._disposed) return;
    this._disposed = true;
    if (emit) this.change.emit({ type: 'close' });
    // ngOnDestroy será llamado por el framework al destruir el ComponentRef.
    // Si dispose() se llama sin que el framework destruya, hacer cleanup manual idempotente.
  }
  ```

### R6 — Constructor config param duplica init 🟢
- **Archivo:línea:** `base-window.directive.ts:73-74`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** El constructor recibe `config?: WindowConfig` y, si llega, ejecuta `this.config = config` (que es el setter, que ya hace Object.assign y reconstruye `layers`/`unit`). Pero el `BaseWindowDirective` normalmente se instancia desde un Component Portal, donde los inputs se asignan **después** del constructor. Tener ambas vías provoca doble inicialización si el portal pasa el config.
- **Fix pendiente:** eliminar el parámetro `config` del constructor; dejar que el setter sea la única fuente.

### R7 — `RfRect.toJSON` mal definido 🟢
- **Archivo:línea:** `redim-frame.interface.ts:158`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** `toJSON: () => ({ x: src.x, ... })` se asigna dentro de un `Object.assign(rect, { get width() {...}, ... })`. Pero `src` aquí es la fuente (`layers.rect`), no el `rect` actual. Si los getters se redefinen en `makeClRV`, el `toJSON` no refleja los valores clamped. Además, `toJSON` no está en la firma de `RfRect` (que extiende `DOMRect`), así que el cast es silencioso.
- **Fix pendiente:**
  ```typescript
  // En makeClRV, exponer un getter que use los valores view (no src):
  toJSON: () => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, ... })
  ```

### R8 — `zIndexPool.sort` O(n log n) en cada release 🟢
- **Archivo:línea:** `service.ts:25-32` (función `releaseZIndex`)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** `this.zIndexPool.sort((a, b) => b - a)` ordena en cada liberación. Como `acquireZIndex` hace `pop()` (toma el mayor), basta con mantener un **min-heap** o insertar en orden inverso. Con 10 ventanas no se nota, pero el contrato es O(n log n) por release.
- **Fix pendiente:** usar un `Set<number>` o un `BinaryHeap` con invariante; o bien evitar el `sort` insertando con búsqueda binaria (`O(log n)`).

### R9 — `pointerEvents: 'none'` frágil 🟢
- **Archivo:línea:** `service.ts:36-39` (líneas 38–39 dentro de `setupWindow`)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** El servicio fuerza `pointer-events: none` en `overlayElement` y `hostElement`. Esto es **necesario** para que el `cdkDrag` pueda iniciarse desde el `drag-handle` interno, pero **bloquea** clicks en cualquier parte del overlay que no sea un handle. Si un consumidor pone un botón dentro del componente user, ese botón no recibe clicks.
- **Fix pendiente:** permitir `pointerEvents` configurable en `WindowConfig` (default `'none'` para mantener compat); o aplicar `'auto'` solo a sub-árboles con clase `rf-passthrough`.

### R10 — `reparentOverlayInto` no detecta parent overlay 🟡
- **Archivo:línea:** `service.ts:131-149`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** `origin.appendChild(overlayRef.hostElement)` funciona, pero si el `originElement` **ya es** un overlay del propio redim-frame, se crea un árbol de overlays anidados cuyo z-index puede romper. Falta guard: `if (origin.classList.contains('cdk-overlay-pane')) { /* skip */ }`.
- **Fix pendiente:** detectar y loguear warning, o exponer flag para deshabilitar reparent.

### R11 — `zIndexCounter` directo sin `releaseZIndex` (duplica IM-01) 🟡
- **Archivo:línea:** `service.ts:58-64` (handler de `focus`)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** Mismo problema que IM-01, observado desde otro ángulo: el handler de `focus` incrementa `this.zIndexCounter++` y reasigna, en vez de llamar a `acquireZIndex()` (que sí usa el pool). Inconsistencia interna.
- **Fix pendiente:** refactorizar a `this.zIndex = this.acquireZIndex()`.

### R12 — e2e focus test incompleto 🟢
- **Archivo:línea:** `tests/e2e/redim-frame/floating-window-drag.spec.ts:53-54`
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** La línea 53 captura `const host1 = window1.locator('..')` pero **nunca hace assert** sobre `host1`. El test pasa trivialmente sin verificar que el z-index cambió tras el click.
- **Fix pendiente:**
  ```typescript
  const host1 = window1.locator('xpath=..');
  const z1 = await host1.evaluate(el => getComputedStyle(el).zIndex);
  expect(Number(z1)).toBeGreaterThan(1000);
  ```

---

## Bugs de Documentación (D1–D4)

> 🔴 **CRÍTICOS** porque los ejemplos del README no compilan; cualquier usuario que copie-pegue obtiene errores TypeScript en tiempo de build.

### D1 — README.md muestra `openWindows(component, config)` con 2 args
- **Archivo:línea:** README antiguo (borrado), aún visible en la versión vieja del EN línea 60 / ES línea 65
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE** (el README actual está corregido; el bug está en la historia git y en copias cacheadas)
- **Detalle:**
  - **Mostraba:**
    ```typescript
    this.windowService.openWindows(MyComponent, { ... });
    ```
  - **Realidad (`service.ts:69`):**
    ```typescript
    openWindows<T>(type: 'modal' | 'window', componentOrTemplate: Type<T> | TemplateRef<T>, config?: StartWindowConfig)
    ```
  - **Fix:** añadir el `type` como primer argumento en todos los ejemplos.

### D2 — README.md muestra `openModal(component, config)` que **NO EXISTE**
- **Archivo:línea:** README antiguo (borrado)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** El método `openModal` no está en `RedimFrameService`. Lo que existe es `openWindows('modal', ...)`.
- **Impacto:** copiar-pegar lanza `TypeError: this.windowService.openModal is not a function`.
- **Fix:** reemplazar por `this.windowService.openWindows('modal', MyComponent, { ... })`.

### D3 — README.md usa campo `data` — el real es `windowData`
- **Archivo:línea:** README antiguo (borrado)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:**
  - **Mostraba:** `data: { message: 'Hello World' }`
  - **Realidad (`redim-frame.interface.ts:34`):** `windowData: any = null;`
- **Fix:** cambiar a `windowData: { ... }` en todos los ejemplos.

### D4 — README.md no distingue window vs modal
- **Archivo:línea:** README antiguo (borrado)
- **Estado verificado 2026-06-04:** ⏳ **PENDIENTE**
- **Detalle:** Los ejemplos eran ambiguos sobre si abrían un `window` (flotante, draggable) o un `modal` (centrado, con backdrop, sin drag). Tras D1/D2, los nuevos ejemplos deben usar explícitamente `type: 'window'` vs `type: 'modal'`.
- **Fix:** sección "Inicio Rápido" con dos ejemplos lado a lado.

---

## Plan de Acción Recomendado

### Fase 0 — Tests ✅ COMPLETADO
- **Estado:** ✅ Hecho el 2026-06-04.
- **Entregables:**
  - `redim-frame.service.spec.ts` — 12 tests (`it(...)`).
  - `floating-window.component.spec.ts` — 11 tests.
  - `modal-window.component.spec.ts` — 5 tests.
  - **Total:** 23 specs en 3 archivos `.spec.ts`.
- **Cobertura objetivo:** sentar la base para refactors seguros de Fase 1–3. El coverage todavía no cubre el 100 % de los branches críticos (faltan: R2 leak path, R5 doble cleanup, R10 parent overlay).

### Fase 1 — P0 (Críticos que rompen memoria o compilación)
1. **CR-01 (R2+R3):** registrar los listeners de `Renderer2` en `BaseWindowDirective.observers` para que `ngOnDestroy` los limpie → resuelve R2 y la mitad de R3.
2. **R5:** eliminar la llamada `this.ngOnDestroy()` desde `dispose()`; dejarlo al framework.
3. **CR-02:** emitir `change({type:'close'})` desde `closeWindow(componentRef)`.
- **Criterio de salida:** los 23 specs siguen verdes + 3 specs nuevos que cubran los 3 fixes.

### Fase 2 — P1 (Resto de críticos, importantes y docs)
1. **CR-04** (TemplatePortal VCR), **CR-05** (subs duplicadas), **CR-06** (mouseleave/blur), **CR-07** (typeof guard en onPortalAttached), **CR-08** (validación de arg), **CR-09** (ModalWindow OnDestroy explícito).
2. **IM-01 / R11** (zIndexCounter): refactor a `acquireZIndex()` / `releaseZIndex()` simétrico.
3. **IM-02** (throttle de resize), **IM-03** (button===0 en modal), **IM-04** (docs de hasBackdrop).
4. **R1** (closeAll), **R4** (CDK `_dragRef` → API pública), **R10** (parent overlay guard).
5. **D1, D2, D3, D4** (corregir README y `docs/errores/redim-frame.md`).
- **Criterio de salida:** los 23 specs + 8 nuevos (uno por IM/R) verdes; README compila.

### Fase 3 — P2 (Menores / optimizaciones / UX)
1. **R6** (constructor config param), **R7** (`RfRect.toJSON`), **R8** (zIndexPool O(log n)), **R9** (pointerEvents configurable), **R12** (completar e2e focus).
2. **MN-04:** decisión UX sobre `resizeBorder` en modal (documentar o implementar handles).
- **Criterio de salida:** plan original 14/14 cerrado + 12 R + 4 D + 1 MN.

---

## Tabla Resumen de Verificación

> Verificación realizada el 2026-06-04 sobre la copia de trabajo del submódulo.

| ID | Severidad | Archivo:línea | Estado 2026-06-04 | Notas |
|---|---|---|---|---|
| CR-01 | 🔴 | `base-window.directive.ts:158` | 🟡 Parcial | R2 cubre el resto |
| CR-02 | 🔴 | `service.ts:154-169` | ⏳ Pendiente | No emite `change` |
| CR-03 | 🔴 | `service.ts:166` | ✅ Arreglado | `windowRegistry.delete` ya está |
| CR-04 | 🔴 | `service.ts:112` | ⏳ Pendiente | `null!` VCR |
| CR-05 | 🔴 | `service.ts:44-67` | ⏳ Pendiente | Subs duplicadas |
| CR-06 | 🔴 | `floating-window.component.ts:41-62` | ⏳ Pendiente | Falta mouseleave/blur |
| CR-07 | 🔴 | `base-window.directive.ts:135-143` | ⏳ Pendiente | Guard de setInput |
| CR-08 | 🔴 | `service.ts:69` | ⏳ Pendiente | Validar `componentOrTemplate` |
| CR-09 | 🔴 | `modal-window.component.ts` | ⏳ Pendiente | Sin `OnDestroy` explícito |
| IM-01 | 🟡 | `service.ts:23,60` | ⏳ Pendiente | Duplica R11 |
| IM-02 | 🟡 | `floating-window.component.ts:92` | ⏳ Pendiente | Throttle de resize |
| IM-03 | 🟡 | `modal-window.component.html:1` | ⏳ Pendiente | Filtrar `event.button === 0` |
| IM-04 | 🟡 | `redim-frame.interface.ts:40` | ⏳ Pendiente | `hasBackdrop` ignorado en window |
| MN-04 | 🟢 | `modal-window.component.html` | ⏳ Pendiente | Decisión UX |
| R1 | 🟢 | `service.ts` (falta) | ⏳ Pendiente | `closeAll()` no existe |
| R2 | 🔴 | `floating-window.component.ts:18-19` | ⏳ Pendiente | Listeners leak |
| R3 | 🔴 | `modal-window.component.ts` | ⏳ Pendiente | OnDestroy explícito |
| R4 | 🟡 | `floating-window.component.ts:35` | ⏳ Pendiente | `_dragRef` privado |
| R5 | 🔴 | `base-window.directive.ts:145-150` | ⏳ Pendiente | `dispose()` → `ngOnDestroy` |
| R6 | 🟢 | `base-window.directive.ts:73-74` | ⏳ Pendiente | Constructor param duplica |
| R7 | 🟢 | `redim-frame.interface.ts:158` | ⏳ Pendiente | `toJSON` mal definido |
| R8 | 🟢 | `service.ts:25-32` | ⏳ Pendiente | `sort` O(n log n) |
| R9 | 🟢 | `service.ts:36-39` | ⏳ Pendiente | `pointerEvents: 'none'` frágil |
| R10 | 🟡 | `service.ts:131-149` | ⏳ Pendiente | Parent overlay no detectado |
| R11 | 🟡 | `service.ts:58-64` | ⏳ Pendiente | Duplica IM-01 |
| R12 | 🟢 | `tests/e2e/redim-frame/floating-window-drag.spec.ts:53-54` | ⏳ Pendiente | e2e sin assert |
| D1 | 🔴 | README (borrado) | ⏳ Pendiente | Firma 2-args |
| D2 | 🔴 | README (borrado) | ⏳ Pendiente | `openModal` no existe |
| D3 | 🟡 | README (borrado) | ⏳ Pendiente | `data` vs `windowData` |
| D4 | 🟡 | README (borrado) | ⏳ Pendiente | Window vs modal |

### Cobertura de tests (Fase 0)

| Spec | Tests | Estado |
|---|---|---|
| `redim-frame.service.spec.ts` | 12 | ✅ Existe |
| `floating-window.component.spec.ts` | 11 | ✅ Existe |
| `modal-window.component.spec.ts` | 5 | ✅ Existe |
| **Total unit** | **23** | **✅** |
| e2e Playwright (3 archivos) | ~6 | ✅ Existe (R12 incompleto) |

### Tasa de resolución del plan original (a 2026-06-04)

- **Arreglados totalmente:** 1/14 = **7 %** (CR-03).
- **Arreglados parcialmente:** 1/14 = **7 %** (CR-01, falta R2).
- **Pendientes:** 12/14 = **86 %**.

### Tasa de resolución de R nuevos (a 2026-06-04)

- **Arreglados:** 0/12 = **0 %**.
- Cobertura de tests sobre R pendientes: 0/12.

### Tasa de resolución de D (a 2026-06-04)

- **Arreglados:** 0/4 = **0 %** (el README actual está corregido, pero la historia git y copias cacheadas mantienen los ejemplos rotos).

---

## Notas Arquitectónicas

### 1. Contrato `dispose()` → `ngOnDestroy()` (R5)

**Problema.** El patrón actual en `BaseWindowDirective`:

```typescript
dispose(emit: boolean = true): void {
  if (!this._disposed) {
    this._disposed = true;
    if (emit) this.change.emit({ type: 'close' });
    this.ngOnDestroy();   // <-- llamada manual
  }
}
```

viola el contrato implícito de Angular: **`ngOnDestroy` se invoca una sola vez por el `DestroyRef`**. Si el framework lo invoca también al destruir el `ComponentRef`, el segundo `while (this.observers.length)` opera sobre un array ya vacío (no rompe, pero la semántica queda acoplada al orden de destrucción).

**Recomendación arquitectónica.** Separar dos responsabilidades:

- `dispose()` → cleanup **manual** idempotente (mata observers, libera z-index, desuscribe, marca `_disposed = true`).
- `ngOnDestroy()` → delega en `dispose(false)` para evitar doble limpieza.

```typescript
dispose(emit: boolean = true): void {
  if (this._disposed) return;
  this._disposed = true;
  while (this.observers.length) { this.observers.pop()?.dis?.(); }
  if (emit) this.change.emit({ type: 'close' });
}
ngOnDestroy() { this.dispose(false); }
```

Esto también permite que `dispose()` se llame desde el consumidor (`RedimFrameService.closeWindow`) sin esperar al `ngOnDestroy` del framework.

### 2. Falta de `closeAll()` (R1)

**Problema.** El servicio mantiene un `WeakMap<ComponentRef, ...>` (`windowRegistry`). Hoy expone:

- `openWindows(type, ctor, config?)` → abre.
- `closeWindow(ref)` → cierra uno.

No hay `closeAll()`. Esto obliga a los consumidores a trackear cada `ComponentRef` que abren (típicamente con `@ViewChildren` o un `Set<ComponentRef>` propio) para poder cerrar en bloque en `ngOnDestroy` del componente raíz o al hacer logout.

**Recomendación arquitectónica.** Añadir `closeAll()` iterando el `windowRegistry`. Como es `WeakMap`, las entradas cuyas `ComponentRef` ya no estén referenciadas se recolectarán solas, así que el bucle es seguro:

```typescript
closeAll(): void {
  const refs = Array.from(this.windowRegistry.keys());
  refs.forEach(ref => this.closeWindow(ref));
}
```

Adicionalmente, exponer un `Observable<WindowChangeEvent>` de tipo `closeAll` en el servicio para que los consumidores puedan reaccionar.

### 3. Inconsistencia `zIndexCounter` ↔ `zIndexPool` (IM-01 / R11)

`acquireZIndex` usa el pool, `releaseZIndex` ordena el pool, pero el handler de `focus` (línea 60) **ignora ambos** y hace `this.zIndexCounter++` directo. La consecuencia es que el contador crece monótonamente y el pool nunca se beneficia de un focus. Unificar a una sola función `acquireZIndex()` también en focus, y un `releaseZIndex(prevZ)` antes de reasignar, cierra IM-01 y R11 en un solo diff.

### 4. Limpieza de `Renderer2.listen` (R2 + parte de R3)

Hoy `FloatingWindowComponent` guarda `unlistenMouseMove` / `unlistenMouseUp` en campos privados, pero `BaseWindowDirective.observers` es el lugar canónico para cleanup. La migración recomendada:

```typescript
// floating-window.component.ts
initResize(event: MouseEvent, direction: string) {
  // ...
  this.observers.push({
    obj: this.renderer.listen('document', 'mousemove', (e) => this.onResize(e)),
    dis: () => this.unlistenMouseMove?.()
  });
  // idem mouseup, mouseleave, blur
}
```

Esto cierra R2 y hace que el `ngOnDestroy` del padre limpie automáticamente — extensible a `ModalWindowComponent` (R3).

---

## Leyenda

- 🔴 Crítico · 🟡 Importante · 🟢 Menor
- ✅ Arreglado · 🟡 Parcial · ⏳ Pendiente · ❌ Descartado · ⏭️ Pospuesto
- P0/P1/P2 = prioridad (0 = bloqueante, 1 = alto, 2 = medio)

---

*Generado el 2026-06-04 como plan autocontenido del submódulo `projects/redim-frame`.*

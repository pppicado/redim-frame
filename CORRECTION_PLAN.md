# Plan de Corrección - redim-frame

> **Fecha de análisis:** 2026-05-05  
> **Archivos analizados:**
> - `src/lib/redim-frame.service.ts`
> - `src/lib/redim-frame.interface.ts`
> - `src/lib/base-window.directive.ts`
> - `src/lib/floating-window/floating-window.component.ts`
> - `src/lib/floating-window/floating-window.component.html`
> - `src/lib/floating-window/floating-window.component.css`
> - `src/lib/modal-window/modal-window.component.ts`
> - `src/lib/modal-window/modal-window.component.html`
> - `src/lib/modal-window/modal-window.component.css`
> - `src/lib/redim-frame.module.ts`
> - `src/public-api.ts`
> - `src/lib/redim-frame.service.spec.ts`
> - `src/lib/floating-window/floating-window.component.spec.ts`
> - `src/lib/modal-window/modal-window.component.spec.ts`
> - `package.json`

---

## Tabla de Contenidos

1. [Errores Críticos](#errores-críticos)
2. [Errores Importantes](#errores-importantes)
3. [Errores Menores](#errores-menores)
4. [Plan de Acción Recomendado](#plan-de-acción-recomendado)
5. [Notas Arquitectónicas](#notas-arquitectónicas)

---

## Errores Críticos

Estos errores provocan memory leaks, crashes en runtime, comportamiento inconsistente de la API, o pérdida de recursos.

---

### CR-01: `BaseWindowDirective.ngOnDestroy` está vacío — Memory leak garantizado

**Archivo:** `src/lib/base-window.directive.ts`  
**Línea:** 37-39

```typescript
ngOnDestroy() {
    // Override if needed in subclasses
}
```

**Motivo del problema:**
Si Angular destruye el componente (por ejemplo, via `*ngIf="false"`, cambio de ruta, o destrucción del padre), `ngOnDestroy` se llama pero no hace nada. No emite el evento `close`, no limpia el overlay, no desuscribe listeners. El `OverlayRef` creado por `RedimFrameService` queda colgado en el DOM, y las subscriptions de `Renderer2` (resize, mousemove) siguen activas.

**Impacto:**
- Memory leak de overlays en el DOM (elementos huérfanos de CDK overlay).
- Memory leak de event listeners (`window.resize`, `document.mousemove`, `document.mouseup`).
- El z-index asignado nunca se libera (aunque el pool lo haría si se llamara `releaseZIndex`).
- El usuario no tiene forma de detectar que la ventana fue destruida externamente.

**Posibles soluciones:**

1. **Llamar a `dispose()` desde `ngOnDestroy`:**
   ```typescript
   ngOnDestroy() {
       this.dispose();
   }
   ```
   Pero `dispose()` emite `{ type: 'close' }` a través de `change`. Hay que asegurarse de que `RedimFrameService` también escuche este evento cuando viene de destrucción Angular, o que el service tenga un mecanismo de cleanup separado.

2. **Separar cleanup de notificación:**
   ```typescript
   ngOnDestroy() {
       if (!this._disposed) {
           this._disposed = true;
           this.change.emit({ type: 'close' });
       }
   }
   ```
   Y asegurar que `FloatingWindowComponent.ngOnDestroy` haga `super.ngOnDestroy()` y limpie sus listeners propios.

---

### CR-02: `RedimFrameService.closeWindow` no notifica al componente — API inconsistente

**Archivo:** `src/lib/redim-frame.service.ts`  
**Líneas:** 241-257

```typescript
closeWindow(componentRef: ComponentRef<any>): void {
    const entry = this.windowRegistry.get(componentRef);
    if (entry) {
        entry.subs.forEach(s => s.unsubscribe());
        entry.overlayRef.dispose();
    }
}
```

**Motivo del problema:**
Cuando el usuario llama `windowInstance.closeWindow()` (método de `BaseWindowDirective`), se emite `{ type: 'close' }`, lo que activa el subscription del service, que limpia recursos y hace `overlayRef.dispose()`.  
Pero cuando el usuario llama `service.closeWindow(ref)`, se limpian recursos directamente **sin emitir** el evento `close`. El componente de la ventana nunca se entera de que fue cerrado.

**Impacto:**
- Si el contenido de la ventana (componente del usuario) tiene lógica de cleanup en respuesta al evento `close`, nunca se ejecuta cuando se cierra programáticamente desde el service.
- Inconsistencia de API: `closeWindow()` a nivel componente vs a nivel service tienen efectos diferentes.

**Posibles soluciones:**

1. **Emitir close antes de limpiar:**
   ```typescript
   closeWindow(componentRef: ComponentRef<any>): void {
       const entry = this.windowRegistry.get(componentRef);
       if (entry) {
           // Notificar al componente primero
           if (componentRef.instance.change) {
               componentRef.instance.change.emit({ type: 'close' });
           }
           // Luego limpiar (las subs del service ya no importan porque se van a limpiar)
           entry.subs.forEach(s => s.unsubscribe());
           entry.overlayRef.dispose();
           this.windowRegistry.delete(componentRef);
       }
   }
   ```

2. **Unificar el flujo de cierre:**
   Hacer que `closeWindow` del service simplemente llame a `componentRef.instance.dispose()`, y que todo el cleanup venga del subscription.

---

### CR-03: `closeWindow` no remueve entrada de `windowRegistry`

**Archivo:** `src/lib/redim-frame.service.ts`  
**Línea:** 241-257

**Motivo del problema:**
Falta `this.windowRegistry.delete(componentRef)`. Aunque `windowRegistry` es `WeakMap`, si el caller mantiene la referencia al `ComponentRef` (lo cual es esperado para poder llamar `closeWindow`), la entrada permanece en el WeakMap incluso después de que el overlay fue dispeado.

**Impacto:**
- Si el usuario llama `closeWindow(ref)` dos veces, `entry` sigue existiendo. Aunque `entry.subs.forEach(...)` sobre un array ya desuscrito es seguro, `entry.overlayRef.dispose()` sobre un overlay ya dispeado puede lanzar error o ser un no-op dependiendo de la implementación de CDK.

**Posibles soluciones:**

```typescript
closeWindow(componentRef: ComponentRef<any>): void {
    const entry = this.windowRegistry.get(componentRef);
    if (entry) {
        ...
        entry.overlayRef.dispose();
        this.windowRegistry.delete(componentRef);
    }
}
```

---

### CR-04: `TemplatePortal` construido con `null!` como `ViewContainerRef`

**Archivo:** `src/lib/redim-frame.service.ts`  
**Líneas:** 129-131, 182-184

```typescript
userPortal = new TemplatePortal(componentOrTemplate, null!, {
    $implicit: config.data
} as any);
```

**Motivo del problema:**
El constructor de `TemplatePortal` en Angular CDK requiere un `ViewContainerRef` válido. Se usa `null!` (non-null assertion) y `as any` para silenciar al compilador. Esto funciona actualmente porque `cdkPortalOutlet` maneja el attach por su cuenta y provee su propio VC, pero es una dependencia de comportamiento interno de CDK.

**Impacto:**
- Si en una futura versión de Angular CDK `TemplatePortal` valida el `ViewContainerRef` en el constructor, esto crashea.
- Si alguien intenta usar el portal manualmente (por ejemplo, `userPortal.attach(someOutlet)`), crashea porque `this.viewContainerRef` es `null`.

**Posibles soluciones:**

1. **Obtener `ViewContainerRef` del componente host:**
   Inyectar `ViewContainerRef` en el constructor de `FloatingWindowComponent`/`ModalWindowComponent` y pasarlo al service, o crear el `TemplatePortal` dentro del componente, no en el service.

2. **Usar `ComponentFactoryResolver` para crear el portal en el contexto correcto:**
   ```typescript
   const vcr = windowRef.injector.get(ViewContainerRef);
   userPortal = new TemplatePortal(componentOrTemplate, vcr, { $implicit: config.data });
   ```

---

### CR-05: Subscriptions duplicadas y patrón frágil en `setupSubscriptions`

**Archivo:** `src/lib/redim-frame.service.ts`  
**Líneas:** 69-94

```typescript
const subs: Subscription[] = [
    windowInstance.change.subscribe((event) => {
        if (event.type === 'close') {
            this.releaseZIndex(windowInstance.zIndex);
            subs.forEach(s => s.unsubscribe());
            ...
        }
    }),
    windowInstance.change.subscribe((event) => {
        if (event.type === 'focus') {
            ...
        }
    })
];
```

**Motivo del problema:**
Se crean dos subscriptions independientes al mismo `EventEmitter`. El primer callback itera sobre `subs` y se desuscribe a sí mismo. Aunque esto funciona porque el array `subs` se captura por referencia antes de que las subscriptions se creen (en realidad, `subs` se inicializa con los resultados de `.subscribe()`), el patrón es frágil:
- Si se modifica el orden de creación, el array `subs` está vacío durante la primera suscripción.
- El segundo subscription SIGUE EXISTIENDO después de que el primero se desuscribe, aunque el overlay fue dispeado.

**Impacto:**
- Patrón de código difícil de mantener y propenso a regressiones.
- En edge cases, puede quedar un subscription zombie que referencia a un overlay ya destruido.

**Posibles soluciones:**

1. **Usar `takeUntil` o un subject de destrucción:**
   ```typescript
   private setupSubscriptions(windowInstance: BaseWindowDirective, overlayRef: OverlayRef): Subscription {
       const destroy$ = new Subject<void>();
       
       const sub = windowInstance.change.pipe(takeUntil(destroy$)).subscribe(event => {
           if (event.type === 'close') {
               destroy$.next();
               destroy$.complete();
               this.releaseZIndex(windowInstance.zIndex);
               ...
           }
           if (event.type === 'focus') {
               ...
           }
       });
       
       return sub;
   }
   ```

2. **Mantener un solo subscription con `switch`:**
   ```typescript
   const sub = windowInstance.change.subscribe(event => {
       switch (event.type) {
           case 'close': ... break;
           case 'focus': ... break;
       }
   });
   ```

---

### CR-06: Resize queda colgado si el mouse sale del navegador

**Archivo:** `src/lib/floating-window/floating-window.component.ts`  
**Líneas:** 106-123

```typescript
initResize(event: MouseEvent, direction: string) {
    ...
    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (e) => this.onResize(e));
    this.mouseUpListener = this.renderer.listen('document', 'mouseup', () => this.stopResize());
}
```

**Motivo del problema:**
Se escucha `mouseup` en `document`, pero si el usuario suelta el mouse fuera de la ventana del navegador (por ejemplo, en la barra de tareas o en otro monitor), el evento `mouseup` no se dispara. El listener de `mousemove` sigue activo, y el resize continúa cuando el mouse vuelve a entrar.

**Impacto:**
- UX rota: la ventana sigue redimensionándose después de soltar el botón.
- Potencial performance issue por listener de mousemove persistente.

**Posibles soluciones:**

1. **Escuchar `mouseleave` en `window` o `document`:**
   ```typescript
   this.mouseLeaveListener = this.renderer.listen('document', 'mouseleave', () => this.stopResize());
   ```
   Nota: `mouseleave` en document no siempre se dispara en todos los navegadores cuando el mouse sale de la ventana.

2. **Usar `window.blur` como fallback:**
   ```typescript
   this.blurListener = this.renderer.listen('window', 'blur', () => this.stopResize());
   ```

3. **Capturar el pointer con Pointer Events API:**
   ```typescript
   (event.target as HTMLElement).setPointerCapture(event.pointerId);
   // y escuchar pointerup en el mismo elemento
   ```
   Esto garantiza que se reciban los eventos de release incluso fuera de la ventana.

---

### CR-07: `onPortalAttached` asume que `windowData` es objeto y no primitivo

**Archivo:** `src/lib/base-window.directive.ts`  
**Líneas:** 51-61

```typescript
onPortalAttached(ref: CdkPortalOutletAttachedRef) {
    if (ref instanceof ComponentRef && this.windowData) {
        Object.keys(this.windowData).forEach(key => {
            try {
                ref.setInput(key, this.windowData[key]);
            } catch {
                // Input doesn't exist on component — skip silently
            }
        });
    }
}
```

**Motivo del problema:**
La condición `this.windowData` es truthiness check. Si `windowData` es `0`, `''`, `false`, o `NaN`, no entra (bien, porque no tienen keys). Pero si es un array `[]`, `Object.keys([])` devuelve `[]` (seguro). El problema real es que `windowData` es tipado como `any`, y el código asume que es un objeto plano. Si es un `Date`, `RegExp`, o cualquier objeto con propiedades no deseadas, se intentarán setear como inputs.

**Impacto:**
- Si el usuario pasa `data: new Date()`, se intentará hacer `setInput('toString', ...)` y otros métodos del prototype (aunque `Object.keys` no enumera propiedades del prototype, solo own enumerable). Con `Date`, `Object.keys(new Date())` es `[]`, así que no hay problema directo. Pero con objetos personalizados con getters/setters, puede haber side effects.

**Posibles soluciones:**

1. **Verificar que sea un objeto plano:**
   ```typescript
   if (ref instanceof ComponentRef && this.windowData && typeof this.windowData === 'object' && !Array.isArray(this.windowData)) {
       Object.keys(this.windowData).forEach(key => {
           ref.setInput(key, this.windowData[key]);
       });
   }
   ```
   *(Nota: si se quiere soportar arrays como data, hay que definir la semántica.)*

2. **Añadir opción `inputs` en `StartWindowConfig`:**
   ```typescript
   export interface StartWindowConfig {
       ...
       inputs?: Record<string, any>;
   }
   ```
   Y deprecar el uso automático de `data` como inputs.

---

### CR-08: `openWindows`/`openModal` no validan input `componentOrTemplate`

**Archivo:** `src/lib/redim-frame.service.ts`  
**Líneas:** 96, 144

**Motivo del problema:**
Si se pasa `null` o `undefined` como primer argumento:
```typescript
service.openWindows(null);
```
`null instanceof TemplateRef` es `false`, y cae en `new ComponentPortal(null, null, injector)` que lanzará un error en CDK.

**Impacto:**
- Crash con mensaje de error poco descriptivo.

**Posibles soluciones:**

```typescript
if (!componentOrTemplate) {
    throw new Error('redim-frame: componentOrTemplate is required');
}
```

---

### CR-09: `ModalWindowComponent` no implementa `OnDestroy` ni limpia sus recursos

**Archivo:** `src/lib/modal-window/modal-window.component.ts`

**Motivo del problema:**
`ModalWindowComponent` extiende `BaseWindowDirective` pero no implementa `OnDestroy`. Aunque hereda el método vacío de `BaseWindowDirective`, no limpia nada si Angular destruye el componente externamente.

**Impacto:**
- Igual que CR-01: memory leak de overlay si el modal se destruye sin pasar por `closeWindow`.

**Posibles soluciones:**

```typescript
export class ModalWindowComponent extends BaseWindowDirective implements OnDestroy {
    override ngOnDestroy() {
        this.dispose();
        super.ngOnDestroy();
    }
}
```

---

## Errores Importantes

---

### IM-01: `zIndexCounter` crece sin límite en eventos de focus

**Archivo:** `src/lib/redim-frame.service.ts`  
**Líneas:** 83-91

```typescript
windowInstance.change.subscribe((event) => {
    if (event.type === 'focus') {
        this.zIndexCounter++;
        windowInstance.zIndex = this.zIndexCounter;
        ...
    }
});
```

**Motivo del problema:**
Cada vez que una ventana recibe focus, `zIndexCounter` se incrementa. No hay límite superior. En una aplicación con muchas interacciones, puede alcanzar `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991), aunque es poco probable en la práctica. Más grave: `releaseZIndex` devuelve el valor al pool, y `acquireZIndex` reutiliza del pool, pero el counter sigue creciendo.

**Impacto:**
- En teoría, overflow de número. En práctica, las CSS properties con z-index > 2^31 pueden comportarse mal en algunos navegadores (aunque es raro).
- Desperdicio de z-indexes altos que podrían reutilizarse.

**Posibles soluciones:**

1. **Usar `acquireZIndex` también para focus:**
   ```typescript
   if (event.type === 'focus') {
       const newZ = this.acquireZIndex();
       windowInstance.zIndex = newZ;
       ...
   }
   ```
   Pero hay que liberar el z-index anterior antes.

2. **Reutilizar el z-index anterior:**
   ```typescript
   const oldZ = windowInstance.zIndex;
   this.releaseZIndex(oldZ);
   windowInstance.zIndex = this.acquireZIndex();
   ```

---

### IM-02: `resize` event emitido en cada frame de `mousemove`

**Archivo:** `src/lib/floating-window/floating-window.component.ts`  
**Línea:** 152

```typescript
this.change.emit({ type: 'resize', width: this.width, height: this.height, x: this.x, y: this.y });
```

**Motivo del problema:**
`onResize` se llama en cada evento `mousemove` durante el resize. Si hay múltiples reacciones suscritas a `change`, se ejecutan en cada frame.

**Impacto:**
- Performance degradation si las reacciones son costosas (por ejemplo, guardar en localStorage, redibujar otros componentes).
- En aplicaciones Angular con ChangeDetectionStrategy.OnPush, puede causar muchos ciclos de detección de cambios.

**Posibles soluciones:**

1. **Throttle con `requestAnimationFrame`:**
   ```typescript
   private resizeRafId: number | null = null;
   
   onResize(event: MouseEvent) {
       if (this.resizeRafId) return;
       this.resizeRafId = requestAnimationFrame(() => {
           this.resizeRafId = null;
           // ... lógica de resize ...
           this.change.emit({ type: 'resize', ... });
       });
   }
   ```

2. **Emitir solo cuando cambian los valores:**
   ```typescript
   if (width !== this.lastEmittedWidth || height !== this.lastEmittedHeight) {
       this.change.emit({ type: 'resize', ... });
   }
   ```

---

### IM-03: Cualquier botón del mouse en backdrop cierra el modal

**Archivo:** `src/lib/modal-window/modal-window.component.html`  
**Línea:** 1

```html
<div class="modal-backdrop-layer" (mousedown)="closeWindow()">
```

**Motivo del problema:**
`mousedown` se dispara con cualquier botón: izquierdo, derecho, rueda central, botones laterales del mouse. Un click derecho en el backdrop cierra el modal, lo cual es inesperado.

**Impacto:**
- UX confusa. Usuarios que intenten abrir el menú contextual del navegador cierran el modal.

**Posibles soluciones:**

1. **Verificar `event.button === 0`:**
   ```typescript
   onBackdropClick(event: MouseEvent) {
       if (event.button === 0) this.closeWindow();
   }
   ```
   ```html
   <div class="modal-backdrop-layer" (mousedown)="onBackdropClick($event)">
   ```

2. **Usar `(click)` en vez de `(mousedown)`:**
   ```html
   <div class="modal-backdrop-layer" (click)="closeWindow()">
   ```
   El evento `click` solo se dispara con el botón izquierdo.

---

### IM-04: `hasBackdrop` en interfaz común pero solo usado en modal

**Archivo:** `src/lib/redim-frame.interface.ts`  
**Línea:** 31

```typescript
export interface StartWindowConfig {
    ...
    hasBackdrop?: boolean;
}
```

**Motivo del problema:**
`hasBackdrop` es parte de la interfaz de configuración compartida entre `openWindows` y `openModal`, pero `openWindows` ignora completamente este campo. Esto puede confundir a los usuarios que esperan que una floating window tenga backdrop.

**Impacto:**
- API confusa. Los usuarios pueden intentar `openWindows(Component, { hasBackdrop: true })` y no obtener el resultado esperado.

**Posibles soluciones:**

1. **Dividir la interfaz:**
   ```typescript
   export interface BaseWindowConfig { ... }
   export interface FloatingWindowConfig extends BaseWindowConfig { ... }
   export interface ModalWindowConfig extends BaseWindowConfig {
       hasBackdrop?: boolean;
   }
   ```

2. **Implementar backdrop para floating windows:**
   Si es una feature deseada, implementarla. Si no, documentar claramente que `hasBackdrop` solo aplica a modales.

---

### IM-05: `reparentOverlayInto` asume estructura DOM específica

**Archivo:** `src/lib/redim-frame.service.ts`  
**Líneas:** 204-234

```typescript
const parentHost = hostElement.closest('.window-container')?.closest('.cdk-overlay-container') ?? origin;
```

**Motivo del problema:**
El código asume que:
1. El overlay del padre tiene `.window-container` dentro de `.cdk-overlay-container`.
2. El `hostElement` del overlay hijo es descendiente de `.window-container`.

Si el componente padre no tiene `.window-container` (por ejemplo, porque es un modal o porque aún no se renderizó), `closest('.window-container')` devuelve `null`, y se usa `origin`. Esto puede funcionar, pero es una asunción frágil del DOM.

**Impacto:**
- Si se cambian las clases CSS de los componentes, el reparenting deja de funcionar.
- Dependencia implícita entre el service y las clases CSS de los componentes.

**Posibles soluciones:**

1. **Usar una referencia directa al overlay padre:**
   En vez de buscar por clase CSS, almacenar una referencia al `OverlayRef` padre y usar `overlayRef.hostElement` directamente.

2. **Marcar el host element con un atributo data:**
   ```typescript
   hostElement.setAttribute('data-redim-host', '');
   // y buscar por [data-redim-host]
   ```

---

### IM-06: HostBindings CSS variables redundantes

**Archivo:** `src/lib/floating-window/floating-window.component.ts`  
**Líneas:** 13-18

```typescript
@HostBinding('style.--width') get widthStyle() { return this.width + 'vw'; }
@HostBinding('style.--height') get heightStyle() { return this.height + 'vh'; }
@HostBinding('style.--left') get leftStyle() { return this.x + 'vw'; }
@HostBinding('style.--top') get topStyle() { return this.y + 'vh'; }
```

**Archivo:** `src/lib/floating-window/floating-window.component.html`  
**Líneas:** 3-4

```html
[style.width.vw]="width" [style.height.vh]="height"
```

**Motivo del problema:**
Las variables CSS `--width`, `--height`, etc. son seteadas por HostBinding, pero no se usan en ningún lugar del CSS. En el template, se setean las propiedades `style.width` y `style.height` directamente. Lo mismo ocurre en `ModalWindowComponent`.

**Impacto:**
- Código muerto.
- Posible conflicto: si alguien intenta usar las variables CSS, pueden no coincidir con los valores reales porque hay dos fuentes de verdad.

**Posibles soluciones:**

1. **Eliminar los HostBindings redundantes** y usar solo el template.
2. **O eliminar las bindings del template** y usar solo CSS variables con `style.width: var(--width)`.

---

### IM-07: `focus` handler no libera z-index anterior antes de asignar nuevo

**Archivo:** `src/lib/redim-frame.service.ts`  
**Líneas:** 83-91

**Motivo del problema:**
Cuando una ventana recibe focus, se le asigna un nuevo z-index sin liberar el anterior. Aunque `releaseZIndex` se llama en `close`, durante la vida de la ventana puede acumularse z-indexes "perdidos" si se hace focus muchas veces.

**Impacto:**
- El pool de z-indexes crece innecesariamente.
- En un sistema con muchas ventanas y muchos focus changes, el pool puede volverse grande.

**Posibles soluciones:**

```typescript
if (event.type === 'focus') {
    const oldZ = windowInstance.zIndex;
    this.releaseZIndex(oldZ);
    const newZ = this.acquireZIndex();
    windowInstance.zIndex = newZ;
    if (overlayRef.hostElement) {
        overlayRef.hostElement.style.zIndex = `${newZ}`;
    }
}
```

---

### IM-08: API pública limitada — no hay lista de ventanas ni cierre masivo

**Archivo:** `src/lib/redim-frame.service.ts`

**Motivo del problema:**
El service no expone:
- Lista de ventanas abiertas.
- Método para cerrar todas las ventanas.
- Método para cerrar por ID o por tipo.
- Observable de cambios a nivel global.

**Impacto:**
- Si el usuario necesita implementar "cerrar todos" o "minimizar todos", tiene que mantener su propio registro de referencias a `ComponentRef`.

**Posibles soluciones:**

1. **Añadir métodos públicos:**
   ```typescript
   getOpenWindows(): ReadonlyArray<ComponentRef<any>> { ... }
   closeAll(): void { ... }
   ```

2. **Emitir eventos globales:**
   ```typescript
   readonly globalChanges = new Subject<{ action: 'open' | 'close', ref: ComponentRef<any> }>();
   ```

---

### IM-09: `getBoundingClientRect` no considera transformaciones CSS

**Archivo:** `src/lib/floating-window/floating-window.component.ts`  
**Líneas:** 84-99

```typescript
const rect = element.getBoundingClientRect();
```

**Motivo del problema:**
Si hay una transformación CSS (scale, rotate) aplicada al elemento o a un ancestro, `getBoundingClientRect` devuelve las coordenadas transformadas. La lógica de porcentaje asume coordenadas lineales.

**Impacto:**
- Si la ventana está dentro de un contenedor con `transform: scale(0.8)`, la posición calculada al soltar el drag será incorrecta.

**Posibles soluciones:**

1. **Usar `getBoundingClientRect` del origin para compensar:**
   Ya se hace parcialmente. Asegurar que se compensen todas las transformaciones.

2. **Usar `position: fixed` en vez de porcentajes:**
   Simplificaría la matemática pero cambiaría el modelo de posicionamiento.

---

### IM-10: Tests usan `setTimeout` real en lugar de `fakeAsync`

**Archivo:** `src/lib/redim-frame.service.spec.ts`, `src/lib/floating-window/floating-window.component.spec.ts`

```typescript
setTimeout(() => {
    expect(...);
    done();
}, 0);
```

**Motivo del problema:**
Los tests usan `setTimeout` con callback `done()`. Esto hace que los tests sean asíncronos reales y potencialmente flaky. Angular provee `fakeAsync`/`tick` para este propósito.

**Impacto:**
- Tests más lentos.
- Posible flakiness en CI si hay carga del sistema.

**Posibles soluciones:**

```typescript
it('should unsubscribe on close', fakeAsync(() => {
    windowInstance.change.emit({ type: 'close' });
    tick();
    expect(subs.every(s => s.closed)).toBe(true);
}));
```

---

## Errores Menores

---

### MN-01: `BaseWindowDirective` selector no se usa como atributo

**Archivo:** `src/lib/base-window.directive.ts`  
**Línea:** 4-6

```typescript
@Directive({
    selector: '[libBaseWindow]'
})
```

**Motivo del problema:**
La directiva se usa exclusivamente como clase base para `FloatingWindowComponent` y `ModalWindowComponent`. El selector `[libBaseWindow]` no se utiliza en ningún template como atributo.

**Impacto:**
Ninguno funcional, pero confunde la intención del código.

**Posibles soluciones:**
Cambiar a una clase abstracta en vez de directiva:
```typescript
export abstract class BaseWindow { ... }
```
O mantener como directiva pero sin selector:
```typescript
@Directive({ selector: 'base-window' }) // o sin selector
```

---

### MN-02: `resizeDirection` tipado como `string`

**Archivo:** `src/lib/floating-window/floating-window.component.ts`  
**Línea:** 41

```typescript
private resizeDirection: string = '';
```

**Motivo del problema:**
El tipo permite cualquier string. Los valores válidos son `'e' | 'w' | 's' | 'n' | 'se' | 'nw' | 'ne' | 'sw' | ''`.

**Impacto:**
Ninguno funcional (porque los handlers son string literals en el HTML), pero pierde type safety.

**Posibles soluciones:**

```typescript
type ResizeDirection = 'e' | 'w' | 's' | 'n' | 'se' | 'nw' | 'ne' | 'sw' | '';
private resizeDirection: ResizeDirection = '';
```

---

### MN-03: `RedimFrameModule` exporta `VirtualScrollbarModule`

**Archivo:** `src/lib/redim-frame.module.ts`  
**Línea:** 28

```typescript
exports: [
    ...
    VirtualScrollbarModule
]
```

**Motivo del problema:**
Re-exportar un módulo de terceros puede causar conflictos si el consumidor ya importó `VirtualScrollbarModule` por su cuenta. Además, fomenta el acoplamiento implícito.

**Impacto:**
- Posible "declared in multiple modules" error si el usuario también declara `VirtualScrollbarModule`.
- API pública más grande de lo necesario.

**Posibles soluciones:**

1. **No re-exportar.** Documentar que el usuario debe importar `VirtualScrollbarModule` si lo necesita.
2. **O re-exportar solo los tipos/exports necesarios**, no el módulo completo.

---

### MN-04: Modal permite config de resize pero no tiene handles

**Archivo:** `src/lib/modal-window/modal-window.component.html`

**Motivo del problema:**
La interfaz `StartWindowConfig` permite `minWidth`, `minHeight`, `resizeBorder`, y el `ModalWindowComponent` extiende `BaseWindowDirective` que tiene estos inputs. Pero el template del modal no tiene ningún `.resize-handle`, por lo que no es redimensionable.

**Impacto:**
- Configuración silenciosamente ignorada.

**Posibles soluciones:**
1. **Añadir handles al modal** si se quiere que sea redimensionable.
2. **Omitir los inputs de resize del modal** y usar una interfaz separada.

---

## Plan de Acción Recomendado

### Fase 1: Seguridad y estabilidad (inmediata)
1. **CR-01**: Implementar cleanup en `BaseWindowDirective.ngOnDestroy`.
2. **CR-02**: Hacer que `service.closeWindow` notifique al componente.
3. **CR-03**: Añadir `windowRegistry.delete` en `closeWindow`.
4. **CR-09**: Implementar cleanup de resize en `ModalWindowComponent.ngOnDestroy`.

### Fase 2: Robustez de runtime
5. **CR-06**: Añadir listener de `mouseleave`/`blur` para resize.
6. **CR-04**: Refactorizar `TemplatePortal` para usar `ViewContainerRef` real.
7. **CR-08**: Validar `componentOrTemplate` en métodos `open`.
8. **CR-07**: Mejorar validación de `windowData` en `onPortalAttached`.

### Fase 3: Performance y mantenibilidad
9. **CR-05**: Refactorizar `setupSubscriptions` con `takeUntil` o single subscription.
10. **IM-01**: Liberar z-index anterior antes de asignar nuevo en focus.
11. **IM-02**: Throttle de eventos `resize` con `requestAnimationFrame`.
12. **IM-06**: Eliminar HostBindings CSS variables redundantes.

### Fase 4: UX y API
13. **IM-03**: Cambiar `(mousedown)` a `(click)` o verificar `button === 0` en modal backdrop.
14. **IM-04**: Separar interfaces de config para floating y modal.
15. **IM-08**: Exponer métodos `closeAll` / `getOpenWindows`.
16. **IM-05**: Desacoplar `reparentOverlayInto` de clases CSS.

### Fase 5: Limpieza
17. **MN-01**: Convertir `BaseWindowDirective` a clase abstracta.
18. **MN-02**: Tipar `resizeDirection` restrictivamente.
19. **MN-03**: Dejar de re-exportar `VirtualScrollbarModule`.
20. **IM-10**: Migrar tests a `fakeAsync`/`tick`.

---

## Notas Arquitectónicas

### Ciclo de vida de ventanas
Actualmente hay **tres formas** de cerrar una ventana:
1. El usuario hace algo que llama `windowInstance.closeWindow()` → emite `close` → subscription del service limpia.
2. Se llama `service.closeWindow(ref)` → limpia directamente sin notificar.
3. Angular destruye el componente → `ngOnDestroy` vacío → **nada se limpia**.

Se recomienda unificar a **un solo flujo**:
```
Cierre iniciado → emitir 'close' → service escucha → cleanup de overlay → destruir componente
```
Y que `ngOnDestroy` sea un "cierre defensivo" que solo limpia si no se cerró antes.

### Gestión de z-index
El sistema de pool es bueno, pero la asignación de focus rompe el contrato:
- `acquireZIndex()` obtiene del pool o del counter.
- `focus` incrementa el counter directamente, sin pasar por `acquireZIndex`.
- `releaseZIndex()` devuelve al pool.

Se recomienda que **TODA** asignación de z-index pase por `acquireZIndex`, y que `focus` libere el anterior antes de adquirir el nuevo.

### Dependencia de CDK Overlay
El service está fuertemente acoplado a CDK Overlay. Si en el futuro se quiere soportar otro sistema de overlays, se debería extraer una interfaz `OverlayAdapter`.

---

*Documento generado automáticamente a partir del análisis de código.*

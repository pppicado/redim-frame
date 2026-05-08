# @pppicado/redim-frame

Una biblioteca de Angular 16 que proporciona ventanas flotantes redimensionables y arrastrables, asi como dialogos modales centrados, usando estilos de Bootstrap 5. Utiliza `@angular/cdk` para arrastre, posicionamiento de overlay y carga de contenido dinamico mediante portales.

## Caracteristicas

- **Ventanas Flotantes**: Ventanas arrastrables, redimensionables y no bloqueantes que flotan sobre la pagina.
- **Dialogos Modales**: Overlays centrados con fondo oscuro opcional y bloqueo de scroll.
- **Unidades de Viewport**: Usa `vw` y `vh` para todas las dimensiones y posicionamiento, asegurando que las ventanas escaleen con el navegador.
- **Contenido Dinamico**: Carga cualquier componente o template de Angular en una ventana mediante portales de CDK.
- **Inyeccion de Datos**: Pasa datos a los componentes de ventana usando el token de inyeccion `WINDOW_DATA`.
- **Gestion de z-Index**: Asignacion automatica y pooling de z-index para multiples ventanas simultaneas.
- **Overlays Anidados / Reparentados**: Abre ventanas hijas dentro de una ventana padre usando la configuracion `origin`.
- **Variables CSS**: Inyecta automaticamente las variables CSS `--window-width` y `--window-height` para contenido responsive dentro de las ventanas.
- **Estilos Bootstrap**: Construido con clases de tarjeta de Bootstrap 5.
- **Scrollbar Virtual**: Scrollbar personalizado integrado en cada ventana via `@pppicado/virtual-scrollbar`.
- **Cierre Programatico**: Cierra ventanas y limpia recursos via `RedimFrameService.closeWindow()`.

## Instalacion

1. Instala la biblioteca y dependencias:

    ```bash
    npm install @pppicado/redim-frame bootstrap @angular/cdk
    ```

2. Agrega el CSS de Bootstrap a tu `angular.json` o estilos globales:

    ```json
    "styles": [
      "node_modules/bootstrap/dist/css/bootstrap.min.css",
      "src/styles.css"
    ]
    ```

## Configuracion

Importa `RedimFrameModule` en el modulo de tu aplicacion:

```typescript
import { RedimFrameModule } from '@pppicado/redim-frame';

@NgModule({
  imports: [
    RedimFrameModule,
  ],
})
export class AppModule { }
```

## Uso

### Ventanas Flotantes

Inyecta `RedimFrameService` para abrir ventanas flotantes dinamicamente.

```typescript
import { Component } from '@angular/core';
import { RedimFrameService } from '@pppicado/redim-frame';
import { MyComponent } from './my-component/my-component.component';

@Component({ ... })
export class AppComponent {
  constructor(private windowService: RedimFrameService) {}

  openFloatingWindow() {
    this.windowService.openWindows(MyComponent, {
      width: 50,   // 50vw
      height: 40,  // 40vh
      x: 25,       // 25vw desde la izquierda
      y: 30,       // 30vh desde arriba
      data: { message: 'Hola Mundo' }
    });
  }
}
```

### Dialogos Modales

```typescript
openModal() {
  this.windowService.openModal(MyComponent, {
    width: 60,   // 60vw
    height: 50,  // 50vh
    data: { title: 'Titulo del Modal' },
    hasBackdrop: true
  });
}
```

### Accediendo a Datos en el Componente de Ventana

Usa el token de inyeccion `WINDOW_DATA`:

```typescript
import { Component, Inject, Optional } from '@angular/core';
import { WINDOW_DATA } from '@pppicado/redim-frame';

@Component({ ... })
export class MyComponent {
  constructor(@Optional() @Inject(WINDOW_DATA) public data: any) {
    console.log(data); // { message: 'Hola Mundo' }
  }
}
```

### Cierre Programatico

```typescript
const windowRef = this.windowService.openWindows(MyComponent, { ... });

// Mas tarde...
this.windowService.closeWindow(windowRef);
```

### Usando Variables CSS

El contenedor de la ventana establece `--window-width` y `--window-height` basadas en su tamano actual:

```css
.my-content {
  width: 100%;
  height: 100%;
  font-size: calc(var(--window-width) / 20);
}
```

## API

### `RedimFrameService`

| Metodo | Firma | Descripcion |
| :--- | :--- | :--- |
| `openWindows` | `openWindows<T>(componentOrTemplate, config?): ComponentRef<FloatingWindowComponent>` | Abre una ventana flotante arrastrable y redimensionable. |
| `openModal` | `openModal<T>(componentOrTemplate, config?): ComponentRef<ModalWindowComponent>` | Abre un dialogo modal centrado. |
| `closeWindow` | `closeWindow(componentRef): void` | Cierra una ventana y limpia todos sus recursos. |

### `StartWindowConfig`

| Propiedad | Tipo | Por Defecto | Descripcion |
| :--- | :--- | :--- | :--- |
| `width` | `number` | `30` | Ancho inicial en `vw`. |
| `height` | `number` | `30` | Alto inicial en `vh`. |
| `x` | `number` | `10` | Posicion X inicial en `vw`. |
| `y` | `number` | `10` | Posicion Y inicial en `vh`. |
| `data` | `any` | `undefined` | Datos para pasar via `WINDOW_DATA`. |
| `scrollIcon` | `string` | `''` | URL de imagen personalizada para el thumb del scrollbar. |
| `minWidth` | `number` | `10` | Ancho minimo en `vw`. |
| `minHeight` | `number` | `10` | Alto minimo en `vh`. |
| `resizeBorder` | `number` | `0.5` | Grosor de los manejadores de redimension en `vw` (0 para modales). |
| `scrollThumbSize` | `number` | `2` | Tamano del thumb del scrollbar en `vw`. |
| `zIndex` | `number` | `auto` | z-index preferido (auto-asignado si se omite). |
| `origin` | `HTMLElement` | `undefined` | Elemento padre al cual reparentar el overlay. |
| `hasBackdrop` | `boolean` | `false` (flotante) / `true` (modal) | Si mostrar un fondo oscuro. |
| `debug` | `boolean` | `false` | Bandera de depuracion. |

### Entradas de `FloatingWindowComponent`

Todas las entradas se heredan de `BaseWindowDirective`:

| Entrada | Tipo | Por Defecto | Descripcion |
| :--- | :--- | :--- | :--- |
| `width` | `number` | `30` | Ancho en `vw`. |
| `height` | `number` | `30` | Alto en `vh`. |
| `x` | `number` | `10` | Posicion X en `vw`. |
| `y` | `number` | `10` | Posicion Y en `vh`. |
| `resizeBorder` | `number` | `0.5` | Grosor de los manejadores de redimension en `vw`. |
| `minWidth` | `number` | `10` | Ancho minimo en `vw`. |
| `minHeight` | `number` | `10` | Alto minimo en `vh`. |
| `scrollIcon` | `string` | `''` | URL de imagen del thumb del scrollbar. |
| `scrollThumbSize` | `number` | `2` | Tamano del thumb del scrollbar en `vw`. |

### API de `BaseWindowDirective`

| Metodo | Descripcion |
| :--- | :--- |
| `getDimensions()` | Devuelve `{ width, height, x, y }`. |
| `dispose()` | Emite evento de cierre y marca como dispuesto. |
| `onWindowClick()` | Emite evento de foco (trae al frente). |
| `closeWindow()` | Emite evento de cierre. |
| `onPortalAttached(ref)` | Inyecta entradas de `windowData` en el componente adjunto. |

## Dependencias Pares

- `@angular/common` `^16.2.0`
- `@angular/core` `^16.2.0`
- `@angular/cdk` `^16.2.0`
- `@pppicado/virtual-scrollbar` `^0.1.0`

## Desarrollo

### Compilacion

```bash
npm run build:windows
```

Esto tambien compila la dependencia `virtual-scrollbar`. Los artefactos de compilacion se almacenan en el directorio `dist/`.

### Ejecutar Pruebas Unitarias

```bash
ng test redim-frame
```

Ejecuta las pruebas unitarias mediante [Karma](https://karma-runner.github.io).

## Ayuda Adicional

Para obtener mas ayuda sobre Angular CLI, usa `ng help` o visita la pagina [Angular CLI Overview and Command Reference](https://angular.io/cli).

## Licencia

MIT

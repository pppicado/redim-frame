# @pppicado/redim-frame

An Angular 16 library that provides resizable, draggable floating windows and centered modal dialogs using Bootstrap 5 styles. It leverages `@angular/cdk` for drag-and-drop, overlay positioning, and dynamic content loading via portals.

## Features

- **Floating Windows**: Draggable, resizable, non-blocking windows that float above the page.
- **Modal Dialogs**: Centered overlays with optional backdrop and scroll blocking.
- **Viewport Units**: Uses `vw` and `vh` for all dimensions and positioning, ensuring windows scale with the browser.
- **Dynamic Content**: Load any Angular component or template into a window via CDK portals.
- **Data Injection**: Pass data to window components using the `WINDOW_DATA` injection token.
- **z-Index Management**: Automatic z-index assignment and pooling for multiple simultaneous windows.
- **Nested / Reparented Overlays**: Open child windows inside a parent window using the `origin` configuration.
- **CSS Variables**: Automatically injects `--window-width` and `--window-height` CSS variables for responsive content inside windows.
- **Bootstrap Styled**: Built with Bootstrap 5 card classes.
- **Virtual Scrollbar**: Built-in custom scrollbar inside every window via `@pppicado/virtual-scrollbar`.
- **Programmatic Close**: Close windows and clean up resources via `RedimFrameService.closeWindow()`.

## Installation

1. Install the library and dependencies:

    ```bash
    npm install @pppicado/redim-frame bootstrap @angular/cdk
    ```

2. Add Bootstrap CSS to your `angular.json` or global styles:

    ```json
    "styles": [
      "node_modules/bootstrap/dist/css/bootstrap.min.css",
      "src/styles.css"
    ]
    ```

## Setup

Import `RedimFrameModule` in your application module:

```typescript
import { RedimFrameModule } from '@pppicado/redim-frame';

@NgModule({
  imports: [
    RedimFrameModule,
  ],
})
export class AppModule { }
```

## Usage

### Floating Windows

Inject `RedimFrameService` to open floating windows dynamically.

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
      x: 25,       // 25vw from left
      y: 30,       // 30vh from top
      data: { message: 'Hello World' }
    });
  }
}
```

### Modal Dialogs

```typescript
openModal() {
  this.windowService.openModal(MyComponent, {
    width: 60,   // 60vw
    height: 50,  // 50vh
    data: { title: 'Modal Title' },
    hasBackdrop: true
  });
}
```

### Accessing Data in the Window Component

Use the `WINDOW_DATA` injection token:

```typescript
import { Component, Inject, Optional } from '@angular/core';
import { WINDOW_DATA } from '@pppicado/redim-frame';

@Component({ ... })
export class MyComponent {
  constructor(@Optional() @Inject(WINDOW_DATA) public data: any) {
    console.log(data); // { message: 'Hello World' }
  }
}
```

### Programmatic Close

```typescript
const windowRef = this.windowService.openWindows(MyComponent, { ... });

// Later...
this.windowService.closeWindow(windowRef);
```

### Using CSS Variables

The window container sets `--window-width` and `--window-height` based on its current size:

```css
.my-content {
  width: 100%;
  height: 100%;
  font-size: calc(var(--window-width) / 20);
}
```

## API

### `RedimFrameService`

| Method | Signature | Description |
| :--- | :--- | :--- |
| `openWindows` | `openWindows<T>(componentOrTemplate, config?): ComponentRef<FloatingWindowComponent>` | Opens a draggable, resizable floating window. |
| `openModal` | `openModal<T>(componentOrTemplate, config?): ComponentRef<ModalWindowComponent>` | Opens a centered modal dialog. |
| `closeWindow` | `closeWindow(componentRef): void` | Closes a window and cleans up all resources. |

### `StartWindowConfig`

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `width` | `number` | `30` | Initial width in `vw`. |
| `height` | `number` | `30` | Initial height in `vh`. |
| `x` | `number` | `10` | Initial X position in `vw`. |
| `y` | `number` | `10` | Initial Y position in `vh`. |
| `data` | `any` | `undefined` | Data to pass via `WINDOW_DATA`. |
| `scrollIcon` | `string` | `''` | Custom scrollbar thumb image URL. |
| `minWidth` | `number` | `10` | Minimum width in `vw`. |
| `minHeight` | `number` | `10` | Minimum height in `vh`. |
| `resizeBorder` | `number` | `0.5` | Thickness of resize handles in `vw` (0 for modals). |
| `scrollThumbSize` | `number` | `2` | Scrollbar thumb size in `vw`. |
| `zIndex` | `number` | `auto` | Preferred z-index (auto-assigned if omitted). |
| `origin` | `HTMLElement` | `undefined` | Parent element to reparent the overlay into. |
| `hasBackdrop` | `boolean` | `false` (floating) / `true` (modal) | Whether to show a backdrop. |
| `debug` | `boolean` | `false` | Debug flag. |

### `FloatingWindowComponent` Inputs

All inputs are inherited from `BaseWindowDirective`:

| Input | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `width` | `number` | `30` | Width in `vw`. |
| `height` | `number` | `30` | Height in `vh`. |
| `x` | `number` | `10` | X position in `vw`. |
| `y` | `number` | `10` | Y position in `vh`. |
| `resizeBorder` | `number` | `0.5` | Resize handle thickness in `vw`. |
| `minWidth` | `number` | `10` | Minimum width in `vw`. |
| `minHeight` | `number` | `10` | Minimum height in `vh`. |
| `scrollIcon` | `string` | `''` | Scrollbar thumb image URL. |
| `scrollThumbSize` | `number` | `2` | Scrollbar thumb size in `vw`. |

### `BaseWindowDirective` API

| Method | Description |
| :--- | :--- |
| `getDimensions()` | Returns `{ width, height, x, y }`. |
| `dispose()` | Emits close event and marks as disposed. |
| `onWindowClick()` | Emits focus event (brings to front). |
| `closeWindow()` | Emits close event. |
| `onPortalAttached(ref)` | Injects `windowData` inputs into the attached component. |

## Peer Dependencies

- `@angular/common` `^16.2.0`
- `@angular/core` `^16.2.0`
- `@angular/cdk` `^16.2.0`
- `@pppicado/virtual-scrollbar` `^0.1.0`

## Development

### Build

```bash
npm run build:windows
```

This also builds the `virtual-scrollbar` dependency. Build artifacts are stored in the `dist/` directory.

### Running Unit Tests

```bash
ng test redim-frame
```

Executes unit tests via [Karma](https://karma-runner.github.io).

## Further Help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## License

MIT

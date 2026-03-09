<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { setupMock } from "./mock";

onLaunch(() => {
  if (import.meta.env.VITE_USE_MOCK === "true") {
    setupMock();
  }
});
onShow(() => {});
onHide(() => {});
</script>
<style>
page {
  background-color: #f8faf9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}

/* 全局隐藏滚动条（H5） */
::-webkit-scrollbar {
  display: none;
}

* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>

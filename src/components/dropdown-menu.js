export function createDropdownMenu(options = {}) {
	const container = document.createElement("div");
	container.id = "dropdown-menu-radio-group";
	container.className = "dropdown-menu";

	const html = `
<button type="button" id="dropdown-menu-radio-group-trigger" aria-haspopup="menu" aria-controls="dropdown-menu-radio-group-menu" aria-expanded="false" class="btn-outline">Selecteer je model:</button>
<div id="dropdown-menu-radio-group-popover" data-popover aria-hidden="true" class="min-w-56">
	<div role="menu" id="dropdown-menu-radio-group-menu" aria-labelledby="dropdown-menu-radio-group-trigger">
		<div role="group" aria-labelledby="position-options">
			<div role="menuitemradio" aria-checked="false" data-value="local" class="group">
				<div class="size-4 flex items-center justify-center">
					<div class="size-2 rounded-full bg-foreground invisible group-aria-checked:visible" aria-hidden="true" focusable="false"></div>
				</div>
				<span class="line-through">
					Lokaal 
					<span class="text-muted-foreground ml-auto text-xs tracking-widest">(Je eigen model via Ollama)</span>
				</span>
			</div>
			<div role="menuitemradio" aria-checked="true" data-value="inference" class="group">
				<div class="size-4 flex items-center justify-center">
					<div class="size-2 rounded-full bg-foreground invisible group-aria-checked:visible" aria-hidden="true" focusable="false"></div>
				</div>
				Inference
				<span class="text-muted-foreground ml-auto text-xs tracking-widest">(Mistral via OpenRouter API)</span>
			</div>
		</div>
	</div>
</div>
	`;

	container.innerHTML = html;

	const radioButtons = container.querySelectorAll('div[role="menuitemradio"]');
	radioButtons.forEach((radioButton) => {
		radioButton.addEventListener("click", () => {
			radioButtons.forEach((btn) => {
				btn.setAttribute("aria-checked", "false");
			});
			radioButton.setAttribute("aria-checked", "true");

			// Get selected value
			const selectedValue = radioButton.getAttribute("data-value");

			// Dispatch value upon change
			const event = new CustomEvent('modelChange', {
				detail: { value: selectedValue },
				bubbles: true
			});
			container.dispatchEvent(event);
		});
	});

	return container;
}






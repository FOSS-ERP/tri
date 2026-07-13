frappe.provide("tri.fiscal_year_widget");

tri.fiscal_year_widget._inflight = false;

$(document).ready(function () {
	tri.fiscal_year_widget.startWatching();
});

tri.fiscal_year_widget.startWatching = function () {
	let observer = new MutationObserver(function () {
		tri.fiscal_year_widget.tryAdd(observer);
	});
	observer.observe(document.body, { childList: true, subtree: true });

	tri.fiscal_year_widget.tryAdd(observer);

	frappe.router.on("change", function () {
		tri.fiscal_year_widget.tryAdd(observer);
	});
};

tri.fiscal_year_widget.tryAdd = function (observer) {
	if ($("#global-fiscal-year-dropdown").length) {
		if (observer) observer.disconnect();
		return;
	}
	if (tri.fiscal_year_widget._inflight) return;

	let $container = $(".navbar > .flex").first();
	if (!$container.length) return;

	tri.fiscal_year_widget._inflight = true;
	addFiscalYearDropdown(function () {
		tri.fiscal_year_widget._inflight = false;
	});
};

function addFiscalYearDropdown(done) {
	if ($("#global-fiscal-year-dropdown").length) {
		if (done) done();
		return;
	}

	let $container = $(".navbar > .flex").first();
	if (!$container.length) {
		setTimeout(function () {
			addFiscalYearDropdown(done);
		}, 1000);
		return;
	}

	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Fiscal Year",
			fields: ["name"],
			order_by: "year_start_date desc",
			limit_page_length: 0,
		},
		callback: function (r) {
			if (done) done();
			if (!r.message) return;

			let options = r.message
				.map((fy) => `<option value="${fy.name}">${fy.name}</option>`)
				.join("");
			let saved = localStorage.getItem("selected_fiscal_year");
			let valid_names = r.message.map((fy) => fy.name);
			let current = saved && valid_names.includes(saved) ? saved : r.message[0].name;

			let $display = $(`
                <div id="fiscal-year-display"
                    style="margin-right:10px; padding:5px 12px; border-radius:6px; border:1px solid #d1d8dd;
                           font-size:13px; font-weight:600; color:#1a1a1a; background:#f4f5f7; display:flex; align-items:center; gap:6px;">
                    <span style="color:#6b7280; font-weight:400;">Fiscal Year:</span>
                    <span id="fiscal-year-display-value">${current}</span>
                </div>
            `);

			let $dropdown = $(`
                <select id="global-fiscal-year-dropdown"
                    style="margin-right:15px; padding:5px 8px; border-radius:6px; border:1px solid #d1d8dd; font-size:13px;">
                    ${options}
                </select>
            `);
			$dropdown.val(current);

			$container.prepend($dropdown);
			$container.prepend($display);

			console.log("Fiscal Year widget initialized. Current:", current);
			localStorage.setItem("selected_fiscal_year", current);

			frappe.call({
				method: "frappe.client.set_value",
				args: {
					doctype: "Fiscal Year",
					name: current,
					fieldname: "custom_default_fiscal_year",
					value: 1,
				},
				callback: function (res) {
					console.log("INIT TEST SUCCESS for", current, ":", res);
				},
				error: function (err) {
					console.error("INIT TEST ERROR for", current, ":", err);
				},
			});

			$dropdown.on("change", function () {
				let selected = $(this).val();
				console.log("Dropdown changed to:", selected);
				localStorage.setItem("selected_fiscal_year", selected);
				$("#fiscal-year-display-value").text(selected);

				frappe.call({
					method: "frappe.client.get_list",
					args: { doctype: "Fiscal Year", fields: ["name"], limit_page_length: 0 },
					callback: function (r2) {
						console.log("Fiscal Year list fetched:", r2.message);
						if (!r2.message) return;
						r2.message.forEach((fy) => {
							let val = fy.name === selected ? 1 : 0;
							console.log(`Setting ${fy.name} checkbox to`, val);
							frappe.call({
								method: "frappe.client.set_value",
								args: {
									doctype: "Fiscal Year",
									name: fy.name,
									fieldname: "custom_default_fiscal_year",
									value: val,
								},
								callback: function (res) {
									console.log(`SUCCESS updating ${fy.name}:`, res);
								},
								error: function (err) {
									console.error(`ERROR updating ${fy.name}:`, err);
								},
							});
						});
						frappe.show_alert({
							message: "Fiscal Year set to " + selected,
							indicator: "blue",
						});
					},
					error: function (err) {
						console.error("ERROR fetching fiscal year list:", err);
					},
				});
			});
		},
		error: function (err) {
			if (done) done();
			console.error("ERROR fetching fiscal year list on init:", err);
		},
	});
}

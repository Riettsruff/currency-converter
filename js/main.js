class FrankFurterAPI {
  static URI = "https://api.frankfurter.app";

  static getCurrencies = async () => {
    return await axios.get(`${FrankFurterAPI.URI}/currencies`);
  };

  static getLatest = async (params) => {
    const path = `/latest?${params.join("&")}`;
    return await axios.get(`${FrankFurterAPI.URI}${path}`);
  };

  static getTimeSeries = async (timePeriod, params) => {
    const path = `/${timePeriod}?${params.join("&")}`;
    return await axios.get(`${FrankFurterAPI.URI}${path}`);
  };
}

class DateFormat {
  static format = (date) => {
    let month = '' + (date.getMonth() + 1);
    let day = '' + date.getDate();
    const year = date.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };
}

class LineChart {
  static draw({container, dataPoints}) {
    const options = {
      animationEnabled: true, 
      responsive: true,
      maintainAspectRatio: false,
      data: [{
        type: "line",
        xValueFormatString: "MMM YYYY",
        dataPoints
      }]
    };

    container.CanvasJSChart(options);
  }
}

$(document).ready(async function() {
  let activeMenu = "Conversion";
  let currencies = await FrankFurterAPI.getCurrencies();

  (() => {
    Object.entries(currencies.data).forEach(([key, value]) => {
      $(".from__select, .to__select, .base__select").append(
        `<option value="${key}">${key} - ${value}</option>`
      );

      $(".currencies-area .currencies-content").append(
        `
          <div class="single-currency-content" data-currency=${key}>
            <div class="single-currency-inner-content">
              <span class="single-currency-name">${key}</span>
              <span class="single-currency-detail-name">${value}</span>
            </div>
            <div class="single-currency-inner-content">
              <span class="single-currency-value"></span>
            </div>
          </div>
        `
      );
    });
  })();

  $(".box-navigation-wrapper .single-box-navigation").on("click", (event) => {
    let currentBoxNavigation;
    let target = $(event.target);

    if(target.hasClass("single-box-navigation-content")) {
      currentBoxNavigation = target.parent();
    } else {
      currentBoxNavigation = target;
    }

    if(!currentBoxNavigation.hasClass("active")) {
      $(".box-navigation-wrapper .single-box-navigation").removeClass("active");
      $(".box-content").removeClass("active");

      activeMenu = currentBoxNavigation.data("nav");
      currentBoxNavigation.addClass("active");

      switch(activeMenu) {
        case "Latest":
          $(".latest-content").addClass("active");
        break;
        case "Time Series":
          $(".time-series-content").addClass("active");
        break;
        case "Conversion":
        default:
          $(".conversion-content").addClass("active");
      }
    }
  });

  $(".conversion-content .amount__input").on("keypress", (event) => {
    const amount = event.target.value;
    const charCode = event.which ? event.which : event.keyCode;
    
    if (charCode == 46) {
      if (amount.indexOf('.') === -1) {
        return true;
      } else {
        return false;
      }
    } else {
      if (charCode > 31 &&
        (charCode < 48 || charCode > 57))
        return false;
    }
    return true;
  });

  $(".conversion-content .convert-button").on("click", async () => {
    const amount = $("#conversion__amount").val();
    const from = $("#conversion__from").val();
    const to = $("#conversion__to").val();

    if(amount === "") {
      swal("Oops!", "Amount input is required", "warning");
      return;
    } 

    if(from === null) {
      swal("Oops!", "From select input must be selected", "warning");
      return;
    } 

    if(to === null) {
      swal("Oops!", "To select input must be selected", "warning");
      return;
    } 

    const conversionResult = await FrankFurterAPI.getLatest([
      `amount=${amount}`,
      `from=${from}`,
      `to=${to}`
    ]);

    $(".conversion-result-from-value").text(amount);
    $(".conversion-result-from-currency").text(from);
    $(".conversion-result-to-value").text(conversionResult.data.rates[to]);
    $(".conversion-result-to-currency").text(to);

    $(".conversion-result").addClass("active");
  });

  $(".latest-content .exchange-button").on("click", async () => {
    const base = $("#exchange_rates__base").val();

    if(base === null) {
      swal("Oops!", "Base select input must be selected", "warning");
      return;
    } 

    const exchangeRateResults = await FrankFurterAPI.getLatest([
      `base=${base}`
    ]);

    $(".latest-content .single-currency-content").removeClass("disabled");

    [...$(".latest-content .single-currency-content")].forEach(item => {
      const currency = $(item).data("currency");

      if(base === currency) $(item).addClass("disabled");
      
      $(item).find(".single-currency-value").text(
        exchangeRateResults.data.rates[currency]
      );
    });
  });

  $(".time-series-content .exchange-button").on("click", async () => {
    const from = $("#time_series__from").val();
    const to = $("#time_series__to").val();

    if(from === null) {
      swal("Oops!", "From select input must be selected", "warning");
      return;
    } 

    if(to === null) {
      swal("Oops!", "To select input must be selected", "warning");
      return;
    } 

    const today = new Date();
    const oneYearPeriod = new Date(today.setMonth(today.getMonth() - 12));

    const exchangeRateResults = await FrankFurterAPI.getTimeSeries(
      `${DateFormat.format(oneYearPeriod)}..${DateFormat.format(new Date())}`,
      [`from=${from}`, `to=${to}`]
    );

    const dataPoints = 
      Object.entries(exchangeRateResults.data.rates).map(([key, value]) => {
        return { 
          x: new Date(key),
          y: value[to]
        };
      });

    $(".time-series-content .currencies-area").removeClass("disabled");

    LineChart.draw({
      container: $(".currencies-chart-by-period"),
      dataPoints
    });
  });

});
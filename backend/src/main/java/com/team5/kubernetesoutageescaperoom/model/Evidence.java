package com.team5.kubernetesoutageescaperoom.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Evidence {
    private String type;
    private String title;
    private String content;
}
